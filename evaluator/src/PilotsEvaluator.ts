import type { Quad } from '@rdfjs/types';
import {
    Engine, Evaluator, EvaluatorInput, EyelingReasoner, materializePolicy, mergeDerivedRuleReports,
    ODRLEngineMultipleSteps, Reasoner, validateInput, Validator,
} from 'odrl-evaluator';
import { Normalizer } from 'odrl-validator/dist/Normalisation';
import { RULES } from './rules/Rules';
import { ShapeConstraintValidator, VALIDATED_SHAPE } from './ShapeValidation';

export type PilotsEvaluatorInput = EvaluatorInput & {
    /**
     * SHACL shapes graph used to evaluate `pilotsProfile:shape` constraints.
     * Every shape used as right operand of such a constraint must be present in here.
     * Defaults to no shapes: `pilotsProfile:shape` constraints are then never satisfied.
     */
    shapes?: Quad[]
}

const DEFAULTS = {
    inputValidation: true,
    instantiation: false,
    normalisation: false,
} as const;

/**
 * ODRL Evaluator for the PILOTS project.
 *
 * - preprocessing: the State of the World is validated against every shape referenced by a `pilotsProfile:shape` constraint;
 * - evaluation: the SHACL validation reports are part of the reasoner input; the PILOTS N3 rules decide the constraint
 *   (satisfied iff the report conforms) and reference the report with `pilotsProfile:shaclReport`;
 * - postprocessing: the referenced SHACL validation reports are added to the compliance report.
 */
export class PilotsODRLEvaluator implements Evaluator {
    private readonly engine: Engine;
    private readonly reasoner: Reasoner;
    private readonly normaliser: Normalizer;
    private readonly shapeValidator: ShapeConstraintValidator;

    private readonly odrlValidator?: Validator<Quad[], boolean>;   // stays undefined => does not validate the ODRL policies
    private readonly inputValidation: boolean;
    private readonly instantiation: boolean;
    private readonly normalisation: boolean;

    constructor(config: PilotsEvaluatorInput = {}) {
        const {
            reasoner = new EyelingReasoner(),
            ODRLValidator,
            inputValidation = DEFAULTS.inputValidation,
            instantiation = DEFAULTS.instantiation,
            normalisation = DEFAULTS.normalisation,
            shapes = [],
        } = config;
        this.odrlValidator = ODRLValidator;
        this.reasoner = reasoner;
        this.engine = new ODRLEngineMultipleSteps({ reasoner, rules: RULES });
        this.normaliser = new Normalizer();
        this.shapeValidator = new ShapeConstraintValidator(shapes);

        this.inputValidation = inputValidation;
        this.instantiation = instantiation;
        this.normalisation = normalisation;
    }

    public async evaluate(policy: Quad[], request: Quad[], state: Quad[]): Promise<Quad[]> {
        // validation
        if (this.inputValidation) {
            validateInput(policy, state);
        }

        if (this.odrlValidator && !(await this.odrlValidator.validate(policy))) {
            throw new Error("One of the ODRL policies is not valid.");
        }

        // preprocess
        let normalized = policy;
        if (this.normalisation) {
            normalized = await this.normaliser.normalise(policy);
        }

        let prepared = normalized;
        if (this.instantiation) {
            prepared = materializePolicy(normalized, state);
        }

        // validate the State of the World against the shapes of the pilotsProfile:shape constraints (SHACL validation reports)
        const shaclReports = await this.shapeValidator.validate(prepared, state);

        // evaluate
        let evaluation = await this.engine.evaluate([...prepared, ...request, ...state, ...shaclReports]);

        // postprocess
        if (this.normalisation) {
            evaluation = mergeDerivedRuleReports(evaluation, normalized);
        }

        // add the SHACL validation reports to the compliance report (referenced with pilotsProfile:shaclReport),
        // without the internal links to their shapes
        evaluation.push(...shaclReports.filter(q => !q.predicate.equals(VALIDATED_SHAPE)));

        return evaluation;
    }
}
