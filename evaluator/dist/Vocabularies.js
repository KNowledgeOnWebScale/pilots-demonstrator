"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prefixes = exports.PILOTS_PROFILE = exports.SH = exports.REPORT = exports.SOTW = exports.XSD = exports.RDFS = exports.RDF = void 0;
const rdf_vocabulary_1 = require("rdf-vocabulary");
const odrl_evaluator_1 = require("odrl-evaluator");
exports.RDF = (0, rdf_vocabulary_1.createVocabulary)('http://www.w3.org/1999/02/22-rdf-syntax-ns#', 'type');
exports.RDFS = (0, rdf_vocabulary_1.createVocabulary)('http://www.w3.org/2000/01/rdf-schema#', 'Class');
exports.XSD = (0, rdf_vocabulary_1.createVocabulary)('http://www.w3.org/2001/XMLSchema#', 'boolean');
exports.SOTW = (0, rdf_vocabulary_1.createVocabulary)('https://w3id.org/force/sotw#', 'SotW');
exports.REPORT = (0, rdf_vocabulary_1.createVocabulary)('https://w3id.org/force/compliance-report#', 'activationState', 'Active', 'Inactive', 'satisfactionState', 'Satisfied', 'Unsatisfied', 'constraint', 'constraintLeftOperand', 'constraintOperator', 'constraintRightOperand');
exports.SH = (0, rdf_vocabulary_1.createVocabulary)('http://www.w3.org/ns/shacl#', 'ValidationReport', 'ValidationResult', 'conforms', 'result', 'focusNode', 'resultMessage', 'resultSeverity', 'sourceShape', 'sourceConstraintComponent', 'Violation', 'MinCountConstraintComponent', 'targetClass', 'targetNode', 'targetSubjectsOf', 'targetObjectsOf');
// ODRL Profile for Physical Internet Logistics and Optimized Transport Systems (PILOTS),
// see ../pilotsProfile.ttl
exports.PILOTS_PROFILE = (0, rdf_vocabulary_1.createVocabulary)('https://pilots-project.be/odrlProfile/', 'shape', 'role', 'shaclReport', 'FocusNodeExistenceConstraintComponent', 'ShapeExistenceConstraintComponent');
exports.prefixes = { ...odrl_evaluator_1.prefixes,
    pilots: 'https://pilots-project.be/ns#',
    pilotsProfile: 'https://pilots-project.be/odrlProfile/',
    sh: 'http://www.w3.org/ns/shacl#',
};
//# sourceMappingURL=Vocabularies.js.map