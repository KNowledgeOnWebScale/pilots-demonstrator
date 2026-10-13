// Interprets an ODRL Compliance Report (https://w3id.org/force/compliance-report) into
// yes/no guidance. This is not a stub: it only reads the report, whichever evaluator made it.
//
//   ComplianceReport.interpret(reportTurtle)
//     -> { granted: boolean, rules: [{ rule, type, active, premises: Premise[] }] }
//   Premise = { label, passed, detail, premises: Premise[] }
(function () {
  'use strict';

  const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
  const RDFS_COMMENT = 'http://www.w3.org/2000/01/rdf-schema#comment';
  const R = 'https://w3id.org/force/compliance-report#';

  const LABELS = {
    TargetReport: 'Target',
    ActionReport: 'Action',
    PartyReport: 'Assignee',
    ConstraintReport: 'Constraint',
  };

  const local = (iri) => iri.replace(/^.*[#/]/, '');

  function interpret(reportTurtle) {
    const store = new N3.Store(new N3.Parser().parse(reportTurtle));
    const one = (s, p) => store.getObjects(s, p, null)[0];
    const typeOf = (node) => store.getObjects(node, RDF_TYPE, null).map((t) => t.value).find((t) => t.startsWith(R));

    function premise(node) {
      const type = local(typeOf(node) ?? 'Premise');
      const constraint = one(node, `${R}constraint`);
      const state = one(node, `${R}satisfactionState`)?.value;
      return {
        label: `${LABELS[type] ?? type}${constraint ? ` ${local(constraint.value)}` : ''}`,
        passed: state === `${R}Satisfied`,
        detail: store.getObjects(node, RDFS_COMMENT, null).map((c) => c.value).join(' '),
        premises: store.getObjects(node, `${R}premiseReport`, null).map(premise),
      };
    }

    const rules = store.getObjects(null, `${R}ruleReport`, null).map((node) => ({
      rule: one(node, `${R}rule`)?.value,
      type: local(typeOf(node) ?? ''),
      attempted: one(node, `${R}attemptState`)?.value === `${R}Attempted`,
      active: one(node, `${R}activationState`)?.value === `${R}Active`,
      premises: store.getObjects(node, `${R}premiseReport`, null).map(premise),
    }));

    const permitted = rules.some((r) => r.type === 'PermissionReport' && r.attempted && r.active);
    const prohibited = rules.some((r) => r.type === 'ProhibitionReport' && r.attempted && r.active);
    return { granted: permitted && !prohibited, rules };
  }

  window.ComplianceReport = { interpret };
})();
