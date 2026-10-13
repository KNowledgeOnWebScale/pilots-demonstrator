import type { Quad } from '@rdfjs/types';
/**
 * Links a SHACL validation report produced by {@link ShapeConstraintValidator} to the shape it validated.
 */
export declare const VALIDATED_SHAPE: import("n3").NamedNode<"http://example.org/validatedShape">;
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
export declare class ShapeConstraintValidator {
    private readonly shapes;
    private readonly validator;
    /**
     * @param shapes - the SHACL shapes graph.
     */
    constructor(shapes: Quad[]);
    /**
     * Validates the State of the World against every shape referred to by a constraint in the policies.
     *
     * @param policy - the ODRL policies.
     * @param state - the State of the World.
     * @returns one SHACL validation report per referred shape (identified by an `urn:uuid:` IRI),
     *  linked to that shape with {@link VALIDATED_SHAPE}; empty when no constraint refers to a shape.
     */
    validate(policy: Quad[], state: Quad[]): Promise<Quad[]>;
    private validateShape;
}
