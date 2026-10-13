import type { Quad } from '@rdfjs/types';
import { Evaluator, EvaluatorInput } from 'odrl-evaluator';
export type PilotsEvaluatorInput = EvaluatorInput & {
    /**
     * SHACL shapes graph used to evaluate `pilotsProfile:shape` constraints.
     * Every shape used as right operand of such a constraint must be present in here.
     * Defaults to no shapes: `pilotsProfile:shape` constraints are then never satisfied.
     */
    shapes?: Quad[];
};
/**
 * ODRL Evaluator for the PILOTS project.
 *
 * - preprocessing: the State of the World is validated against every shape referenced by a `pilotsProfile:shape` constraint;
 * - evaluation: the SHACL validation reports are part of the reasoner input; the PILOTS N3 rules decide the constraint
 *   (satisfied iff the report conforms) and reference the report with `pilotsProfile:shaclReport`;
 * - postprocessing: the referenced SHACL validation reports are added to the compliance report.
 */
export declare class PilotsODRLEvaluator implements Evaluator {
    private readonly engine;
    private readonly reasoner;
    private readonly normaliser;
    private readonly shapeValidator;
    private readonly odrlValidator?;
    private readonly inputValidation;
    private readonly instantiation;
    private readonly normalisation;
    constructor(config?: PilotsEvaluatorInput);
    evaluate(policy: Quad[], request: Quad[], state: Quad[]): Promise<Quad[]>;
}
