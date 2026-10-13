import type { Quad, Quad_Object, Term } from '@rdfjs/types';
import { DataFactory, Store } from 'n3';
import { Validator } from 'shacl-engine';
import { ODRL } from 'odrl-evaluator';
import { PILOTS_PROFILE, RDF, RDFS, SH, SOTW, XSD } from './Vocabularies';

const { namedNode, literal, blankNode, quad } = DataFactory;

/**
 * Links a SHACL validation report produced by {@link ShapeConstraintValidator} to the shape it validated.
 */
export const VALIDATED_SHAPE = namedNode('http://example.org/validatedShape');

// RDF/JS factory for shacl-engine: the N3 data factory, with N3 stores as datasets
const factory = { ...DataFactory, dataset: (quads?: Quad[]) => new Store(quads) };

/**
 * Validates a State of the World against the SHACL shapes that ODRL constraints refer to.
 *
 * A constraint refers to a shape when its left operand is `pilotsProfile:shape`; its right operand is the shape IRI.
 * For each distinct shape, the State of the World is validated against that shape only, resulting in one `sh:ValidationReport`.
 *
 * On top of SHACL validation, a shape only conforms when
 * - it is present in the shapes graph (else: violation with `pilotsProfile:ShapeExistenceConstraintComponent`), and
 * - it has at least one focus node in the State of the World (else: violation with `pilotsProfile:FocusNodeExistenceConstraintComponent`).
 * A plain SHACL engine conforms in both cases, as there is nothing to validate.
 * For these violations, the `sh:focusNode` is the `sotw:SotW` node.
 */
export class ShapeConstraintValidator {
    private readonly shapes: Store;
    private readonly validator: Validator;

    /**
     * @param shapes - the SHACL shapes graph.
     */
    constructor(shapes: Quad[]) {
        this.shapes = new Store(shapes);
        this.validator = new Validator(this.shapes, { factory });
    }

    /**
     * Validates the State of the World against every shape referred to by a constraint in the policies.
     *
     * @param policy - the ODRL policies.
     * @param state - the State of the World.
     * @returns one SHACL validation report per referred shape (identified by an `urn:uuid:` IRI),
     *  linked to that shape with {@link VALIDATED_SHAPE}; empty when no constraint refers to a shape.
     */
    public async validate(policy: Quad[], state: Quad[]): Promise<Quad[]> {
        const policyStore = new Store(policy);
        const shapes = policyStore.getSubjects(ODRL.terms.leftOperand, PILOTS_PROFILE.terms.shape, null)
            .flatMap(constraint => policyStore.getObjects(constraint, ODRL.terms.rightOperand, null));

        const uniqueShapes = new Map(shapes.map(shape => [shape.value, shape]));
        const quads: Quad[] = [];
        for (const shape of uniqueShapes.values()) {
            quads.push(...await this.validateShape(shape, state));
        }
        return quads;
    }

    private async validateShape(shape: Term, state: Quad[]): Promise<Quad[]> {
        const data = new Store(state);
        const report = await this.validator.validate({ dataset: data }, [{ terms: [shape] }]);

        // give the report an IRI, so it can be referenced from the compliance report
        const reportIri = namedNode(`urn:uuid:${globalThis.crypto.randomUUID()}`);
        const asIri = <T extends Term>(term: T): T => (term.equals(report.term) ? reportIri : term) as T;
        let quads = [...report.dataset].map(q => quad(asIri(q.subject), q.predicate, asIri(q.object)));

        const violation = this.shapes.countQuads(shape, null, null, null) === 0
            ? { component: PILOTS_PROFILE.terms.ShapeExistenceConstraintComponent, message: `Shape <${shape.value}> is not present in the shapes graph.` }
            : !hasFocusNode(this.shapes, shape, data)
                ? { component: PILOTS_PROFILE.terms.FocusNodeExistenceConstraintComponent, message: `The State of the World contains no focus node for shape <${shape.value}>: at least one is required.` }
                : undefined;

        if (violation) {
            const sotw = data.getSubjects(RDF.terms.type, SOTW.terms.SotW, null)[0] ?? namedNode('urn:sotw:unknown');
            const result = blankNode();
            quads = [
                ...quads.filter(q => !q.predicate.equals(SH.terms.conforms)),
                quad(reportIri, SH.terms.conforms, literal('false', XSD.terms.boolean)),
                quad(reportIri, SH.terms.result, result),
                quad(result, RDF.terms.type, SH.terms.ValidationResult),
                quad(result, SH.terms.focusNode, sotw as Quad_Object),
                quad(result, SH.terms.sourceShape, shape as Quad_Object),
                quad(result, SH.terms.sourceConstraintComponent, violation.component),
                quad(result, SH.terms.resultSeverity, SH.terms.Violation),
                quad(result, SH.terms.resultMessage, literal(violation.message)),
            ];
        }
        return [...quads, quad(reportIri, VALIDATED_SHAPE, shape as Quad_Object)];
    }
}

/**
 * Whether a shape has at least one focus node in the data graph (SHACL core targets).
 */
function hasFocusNode(shapes: Store, shape: Term, data: Store): boolean {
    const targets = (predicate: Term) => shapes.getObjects(shape, predicate, null);
    return targets(SH.terms.targetClass).some(cls => data.countQuads(null, RDF.terms.type, cls, null) > 0)
        || targets(SH.terms.targetNode).some(node => data.countQuads(node, null, null, null) + data.countQuads(null, null, node, null) > 0)
        || targets(SH.terms.targetSubjectsOf).some(p => data.countQuads(null, p, null, null) > 0)
        || targets(SH.terms.targetObjectsOf).some(p => data.countQuads(null, p, null, null) > 0)
        // implicit class target: the shape is also a class
        || (shapes.countQuads(shape, RDF.terms.type, RDFS.terms.Class, null) > 0
            && data.countQuads(null, RDF.terms.type, shape, null) > 0);
}