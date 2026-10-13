"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShapeConstraintValidator = exports.VALIDATED_SHAPE = void 0;
const n3_1 = require("n3");
const shacl_engine_1 = require("shacl-engine");
const odrl_evaluator_1 = require("odrl-evaluator");
const Vocabularies_1 = require("./Vocabularies");
const { namedNode, literal, blankNode, quad } = n3_1.DataFactory;
/**
 * Links a SHACL validation report produced by {@link ShapeConstraintValidator} to the shape it validated.
 */
exports.VALIDATED_SHAPE = namedNode('http://example.org/validatedShape');
// RDF/JS factory for shacl-engine: the N3 data factory, with N3 stores as datasets
const factory = { ...n3_1.DataFactory, dataset: (quads) => new n3_1.Store(quads) };
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
class ShapeConstraintValidator {
    shapes;
    validator;
    /**
     * @param shapes - the SHACL shapes graph.
     */
    constructor(shapes) {
        this.shapes = new n3_1.Store(shapes);
        this.validator = new shacl_engine_1.Validator(this.shapes, { factory });
    }
    /**
     * Validates the State of the World against every shape referred to by a constraint in the policies.
     *
     * @param policy - the ODRL policies.
     * @param state - the State of the World.
     * @returns one SHACL validation report per referred shape (identified by an `urn:uuid:` IRI),
     *  linked to that shape with {@link VALIDATED_SHAPE}; empty when no constraint refers to a shape.
     */
    async validate(policy, state) {
        const policyStore = new n3_1.Store(policy);
        const shapes = policyStore.getSubjects(odrl_evaluator_1.ODRL.terms.leftOperand, Vocabularies_1.PILOTS_PROFILE.terms.shape, null)
            .flatMap(constraint => policyStore.getObjects(constraint, odrl_evaluator_1.ODRL.terms.rightOperand, null));
        const uniqueShapes = new Map(shapes.map(shape => [shape.value, shape]));
        const quads = [];
        for (const shape of uniqueShapes.values()) {
            quads.push(...await this.validateShape(shape, state));
        }
        return quads;
    }
    async validateShape(shape, state) {
        const data = new n3_1.Store(state);
        const report = await this.validator.validate({ dataset: data }, [{ terms: [shape] }]);
        // give the report an IRI, so it can be referenced from the compliance report
        const reportIri = namedNode(`urn:uuid:${globalThis.crypto.randomUUID()}`);
        const asIri = (term) => (term.equals(report.term) ? reportIri : term);
        let quads = [...report.dataset].map(q => quad(asIri(q.subject), q.predicate, asIri(q.object)));
        const violation = this.shapes.countQuads(shape, null, null, null) === 0
            ? { component: Vocabularies_1.PILOTS_PROFILE.terms.ShapeExistenceConstraintComponent, message: `Shape <${shape.value}> is not present in the shapes graph.` }
            : !hasFocusNode(this.shapes, shape, data)
                ? { component: Vocabularies_1.PILOTS_PROFILE.terms.FocusNodeExistenceConstraintComponent, message: `The State of the World contains no focus node for shape <${shape.value}>: at least one is required.` }
                : undefined;
        if (violation) {
            const sotw = data.getSubjects(Vocabularies_1.RDF.terms.type, Vocabularies_1.SOTW.terms.SotW, null)[0] ?? namedNode('urn:sotw:unknown');
            const result = blankNode();
            quads = [
                ...quads.filter(q => !q.predicate.equals(Vocabularies_1.SH.terms.conforms)),
                quad(reportIri, Vocabularies_1.SH.terms.conforms, literal('false', Vocabularies_1.XSD.terms.boolean)),
                quad(reportIri, Vocabularies_1.SH.terms.result, result),
                quad(result, Vocabularies_1.RDF.terms.type, Vocabularies_1.SH.terms.ValidationResult),
                quad(result, Vocabularies_1.SH.terms.focusNode, sotw),
                quad(result, Vocabularies_1.SH.terms.sourceShape, shape),
                quad(result, Vocabularies_1.SH.terms.sourceConstraintComponent, violation.component),
                quad(result, Vocabularies_1.SH.terms.resultSeverity, Vocabularies_1.SH.terms.Violation),
                quad(result, Vocabularies_1.SH.terms.resultMessage, literal(violation.message)),
            ];
        }
        return [...quads, quad(reportIri, exports.VALIDATED_SHAPE, shape)];
    }
}
exports.ShapeConstraintValidator = ShapeConstraintValidator;
/**
 * Whether a shape has at least one focus node in the data graph (SHACL core targets).
 */
function hasFocusNode(shapes, shape, data) {
    const targets = (predicate) => shapes.getObjects(shape, predicate, null);
    return targets(Vocabularies_1.SH.terms.targetClass).some(cls => data.countQuads(null, Vocabularies_1.RDF.terms.type, cls, null) > 0)
        || targets(Vocabularies_1.SH.terms.targetNode).some(node => data.countQuads(node, null, null, null) + data.countQuads(null, null, node, null) > 0)
        || targets(Vocabularies_1.SH.terms.targetSubjectsOf).some(p => data.countQuads(null, p, null, null) > 0)
        || targets(Vocabularies_1.SH.terms.targetObjectsOf).some(p => data.countQuads(null, p, null, null) > 0)
        // implicit class target: the shape is also a class
        || (shapes.countQuads(shape, Vocabularies_1.RDF.terms.type, Vocabularies_1.RDFS.terms.Class, null) > 0
            && data.countQuads(null, Vocabularies_1.RDF.terms.type, shape, null) > 0);
}
//# sourceMappingURL=ShapeValidation.js.map