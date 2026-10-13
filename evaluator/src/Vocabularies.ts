import { createVocabulary } from 'rdf-vocabulary';
import { prefixes as pref } from 'odrl-evaluator';

export const RDF = createVocabulary('http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    'type');

export const RDFS = createVocabulary('http://www.w3.org/2000/01/rdf-schema#',
    'Class');

export const XSD = createVocabulary('http://www.w3.org/2001/XMLSchema#',
    'boolean');

export const SOTW = createVocabulary('https://w3id.org/force/sotw#',
    'SotW');

export const REPORT = createVocabulary('https://w3id.org/force/compliance-report#',
    'activationState',
    'Active',
    'Inactive',
    'satisfactionState',
    'Satisfied',
    'Unsatisfied',
    'constraint',
    'constraintLeftOperand',
    'constraintOperator',
    'constraintRightOperand',
);

export const SH = createVocabulary('http://www.w3.org/ns/shacl#',
    'ValidationReport',
    'ValidationResult',
    'conforms',
    'result',
    'focusNode',
    'resultMessage',
    'resultSeverity',
    'sourceShape',
    'sourceConstraintComponent',
    'Violation',
    'MinCountConstraintComponent',
    'targetClass',
    'targetNode',
    'targetSubjectsOf',
    'targetObjectsOf',
);

// ODRL Profile for Physical Internet Logistics and Optimized Transport Systems (PILOTS),
// see ../pilotsProfile.ttl
export const PILOTS_PROFILE = createVocabulary('https://pilots-project.be/odrlProfile/',
    'shape',
    'role',
    'shaclReport',
    'FocusNodeExistenceConstraintComponent',
    'ShapeExistenceConstraintComponent',
);

export const prefixes = { ...pref,
    pilots: 'https://pilots-project.be/ns#',
    pilotsProfile: 'https://pilots-project.be/odrlProfile/',
    sh: 'http://www.w3.org/ns/shacl#',
};
