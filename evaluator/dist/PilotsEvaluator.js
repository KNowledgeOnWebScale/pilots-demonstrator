"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PilotsODRLEvaluator = void 0;
const odrl_evaluator_1 = require("odrl-evaluator");
const Normalisation_1 = require("odrl-validator/dist/Normalisation");
const Rules_1 = require("./rules/Rules");
const ShapeValidation_1 = require("./ShapeValidation");
const DEFAULTS = {
    inputValidation: true,
    instantiation: false,
    normalisation: false,
};
/**
 * ODRL Evaluator for the PILOTS project.
 *
 * - preprocessing: the State of the World is validated against every shape referenced by a `pilotsProfile:shape` constraint;
 * - evaluation: the SHACL validation reports are part of the reasoner input; the PILOTS N3 rules decide the constraint
 *   (satisfied iff the report conforms) and reference the report with `pilotsProfile:shaclReport`;
 * - postprocessing: the referenced SHACL validation reports are added to the compliance report.
 */
class PilotsODRLEvaluator {
    engine;
    reasoner;
    normaliser;
    shapeValidator;
    odrlValidator; // stays undefined => does not validate the ODRL policies
    inputValidation;
    instantiation;
    normalisation;
    constructor(config = {}) {
        const { reasoner = new odrl_evaluator_1.EyelingReasoner(), ODRLValidator, inputValidation = DEFAULTS.inputValidation, instantiation = DEFAULTS.instantiation, normalisation = DEFAULTS.normalisation, shapes = [], } = config;
        this.odrlValidator = ODRLValidator;
        this.reasoner = reasoner;
        this.engine = new odrl_evaluator_1.ODRLEngineMultipleSteps({ reasoner, rules: Rules_1.RULES });
        this.normaliser = new Normalisation_1.Normalizer();
        this.shapeValidator = new ShapeValidation_1.ShapeConstraintValidator(shapes);
        this.inputValidation = inputValidation;
        this.instantiation = instantiation;
        this.normalisation = normalisation;
    }
    async evaluate(policy, request, state) {
        // validation
        if (this.inputValidation) {
            (0, odrl_evaluator_1.validateInput)(policy, state);
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
            prepared = (0, odrl_evaluator_1.materializePolicy)(normalized, state);
        }
        // validate the State of the World against the shapes of the pilotsProfile:shape constraints (SHACL validation reports)
        const shaclReports = await this.shapeValidator.validate(prepared, state);
        // evaluate
        let evaluation = await this.engine.evaluate([...prepared, ...request, ...state, ...shaclReports]);
        // postprocess
        if (this.normalisation) {
            evaluation = (0, odrl_evaluator_1.mergeDerivedRuleReports)(evaluation, normalized);
        }
        // add the SHACL validation reports to the compliance report (referenced with pilotsProfile:shaclReport),
        // without the internal links to their shapes
        evaluation.push(...shaclReports.filter(q => !q.predicate.equals(ShapeValidation_1.VALIDATED_SHAPE)));
        return evaluation;
    }
}
exports.PilotsODRLEvaluator = PilotsODRLEvaluator;
//# sourceMappingURL=PilotsEvaluator.js.map