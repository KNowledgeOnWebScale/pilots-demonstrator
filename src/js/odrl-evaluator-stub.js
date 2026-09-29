// STUB ODRL Evaluator (scenario 3).
//
// Replace with the actual ODRL Evaluator (https://w3id.org/force/evaluator). API:
//
//   OdrlEvaluator.evaluate({ policy, request, sotw, shapes })
//     all inputs are Turtle strings
//     -> Promise<string>   an ODRL Compliance Report in Turtle
//
// The page derives its yes/no guidance from the report only (see compliance-report.js),
// so a real evaluator can be dropped in without touching the UI.
//
// The stub handles odrl:permission rules with odrl:target, odrl:action, odrl:assignee
// (IRI or odrl:PartyCollection with odrl:refinement) and odrl:constraint. Left operands
// are resolved through LEFT_OPERANDS; add an entry there to support a new one.
// Explanations are attached to constraint reports as rdfs:comment.
(function () {
  'use strict';

  const NS = {
    rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
    xsd: 'http://www.w3.org/2001/XMLSchema#',
    dct: 'http://purl.org/dc/terms/',
    odrl: 'http://www.w3.org/ns/odrl/2/',
    sotw: 'https://w3id.org/force/sotw#',
    report: 'https://w3id.org/force/compliance-report#',
    pilots: 'https://pilots-project.be/ns#',
    pilotsProfile: 'https://pilots-project.be/odrlProfile/',
    dpv: 'https://w3id.org/dpv#',
    ex: 'http://example.com/',
  };
  const RDF_TYPE = `${NS.rdf}type`;
  const POLICY_TYPES = ['Policy', 'Set', 'Offer', 'Agreement'].map((t) => `${NS.odrl}${t}`);

  function parse(text, label) {
    try {
      return new N3.Store(new N3.Parser().parse(text));
    } catch (error) {
      throw new Error(`${label} is not valid Turtle: ${error.message}`);
    }
  }

  const objects = (store, s, p) => store.getObjects(s, p, null);
  const first = (store, s, p) => objects(store, s, p)[0];
  const subjectsOfType = (store, type) => store.getSubjects(RDF_TYPE, type, null);
  const hasType = (store, node, type) => store.getQuads(node, RDF_TYPE, type, null).length > 0;
  const prefixed = (iri) => {
    for (const [prefix, ns] of Object.entries(NS)) if (iri.startsWith(ns)) return `${prefix}:${iri.slice(ns.length)}`;
    return `<${iri}>`;
  };
  const show = (term) => (term.termType === 'Literal' ? `"${term.value}"` : prefixed(term.value));

  function uuid() {
    if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  // ---------------------------------------------------------------------------
  // Operators: compare the left operand values with the right operand.
  // ---------------------------------------------------------------------------
  const asComparable = (term) => {
    if (term.termType !== 'Literal') return term.value;
    const dt = term.datatype?.value ?? '';
    if (dt.endsWith('#dateTime') || dt.endsWith('#date')) return new Date(term.value).getTime();
    if (/#(decimal|integer|double|float)$/.test(dt)) return Number(term.value);
    return term.value;
  };
  const OPERATORS = {
    [`${NS.odrl}eq`]: (l, r) => l.equals(r) || asComparable(l) === asComparable(r),
    [`${NS.odrl}neq`]: (l, r) => !(l.equals(r) || asComparable(l) === asComparable(r)),
    [`${NS.odrl}lt`]: (l, r) => asComparable(l) < asComparable(r),
    [`${NS.odrl}lteq`]: (l, r) => asComparable(l) <= asComparable(r),
    [`${NS.odrl}gt`]: (l, r) => asComparable(l) > asComparable(r),
    [`${NS.odrl}gteq`]: (l, r) => asComparable(l) >= asComparable(r),
  };

  // ---------------------------------------------------------------------------
  // Left operands. Each resolver receives the evaluation context and the constraint
  // and returns { satisfied, values: Term[], comment }.
  // ---------------------------------------------------------------------------
  function requestParameters(ctx, feature) {
    return ctx.params.filter((p) => p.feature?.value === feature).map((p) => p.value).filter(Boolean);
  }

  function compareValues(values, operator, right, describe) {
    const op = OPERATORS[operator.value];
    if (!op) return { satisfied: false, values, comment: `Operator ${prefixed(operator.value)} is not supported by the stub.` };
    if (values.length === 0) return { satisfied: false, values, comment: `No ${describe} found in the evaluation request.` };
    const satisfied = values.some((v) => op(v, right));
    return {
      satisfied,
      values,
      comment: `${describe} ${values.map(show).join(', ')} ${satisfied ? 'satisfies' : 'does not satisfy'} ${prefixed(operator.value)} ${show(right)}.`,
    };
  }

  const LEFT_OPERANDS = {
    [`${NS.pilotsProfile}role`]: (ctx, { operator, right }) =>
      compareValues(requestParameters(ctx, `${NS.pilots}actorRole`), operator, right, 'Role (pilots:actorRole)'),

    [`${NS.odrl}dateTime`]: (ctx, { operator, right }) =>
      compareValues(requestParameters(ctx, `${NS.sotw}TemporalData`), operator, right, 'Request time (sotw:TemporalData)'),

    [`${NS.pilotsProfile}shape`]: async (ctx, { operator, right }) => {
      if (operator.value !== `${NS.odrl}eq`) {
        return { satisfied: false, values: [], comment: 'pilotsProfile:shape only supports odrl:eq.' };
      }
      const sotwNodes = subjectsOfType(ctx.sotw, `${NS.sotw}SotW`);
      const events = sotwNodes
        .flatMap((node) => objects(ctx.sotw, node, `${NS.sotw}context`))
        .filter((node) => hasType(ctx.sotw, node, `${NS.pilots}ServiceUpdate`));
      if (events.length !== 1) {
        return {
          satisfied: false,
          values: events,
          comment: `Expected exactly one pilots:ServiceUpdate event in the State of the World (sotw:context), found ${events.length}.`,
        };
      }
      const validation = await ShaclValidator.validate({
        data: ctx.sotw, shapes: ctx.shapes, focusNode: events[0], shapeIri: right.value,
      });
      return {
        satisfied: validation.conforms,
        values: events,
        comment: validation.conforms
          ? `Event ${show(events[0])} conforms to ${show(right)}.`
          : `Event ${show(events[0])} does not conform to ${show(right)}: ${validation.results.map((r) => r.message).join(' ')}`,
      };
    },
  };

  // ---------------------------------------------------------------------------
  // Report construction
  // ---------------------------------------------------------------------------
  function reportWriter() {
    const { namedNode, literal, quad } = N3.DataFactory;
    const quads = [];
    const node = (value) => (typeof value === 'string' ? namedNode(value) : value);
    return {
      quads,
      newNode: () => namedNode(`urn:uuid:${uuid()}`),
      add: (s, p, o) => quads.push(quad(node(s), node(p), typeof o === 'object' ? o : node(o))),
      addLiteral: (s, p, value, datatype) => quads.push(quad(node(s), node(p), literal(value, datatype ? namedNode(datatype) : undefined))),
    };
  }

  async function reportConstraint(ctx, out, constraint) {
    const left = first(ctx.policy, constraint, `${NS.odrl}leftOperand`);
    const operator = first(ctx.policy, constraint, `${NS.odrl}operator`);
    const right = first(ctx.policy, constraint, `${NS.odrl}rightOperand`);
    const node = out.newNode();
    out.add(node, RDF_TYPE, `${NS.report}ConstraintReport`);
    out.add(node, `${NS.report}constraint`, constraint);

    let outcome;
    if (!left || !operator || !right) {
      outcome = { satisfied: false, values: [], comment: 'Constraint lacks a left operand, operator or right operand.' };
    } else {
      out.add(node, `${NS.report}constraintOperator`, operator);
      out.add(node, `${NS.report}constraintRightOperand`, right);
      const resolver = LEFT_OPERANDS[left.value];
      outcome = resolver
        ? await resolver(ctx, { operator, right })
        : { satisfied: false, values: [], comment: `Left operand ${prefixed(left.value)} is not supported by the stub.` };
    }
    outcome.values.forEach((v) => out.add(node, `${NS.report}constraintLeftOperand`, v));
    out.add(node, `${NS.report}satisfactionState`, `${NS.report}${outcome.satisfied ? 'Satisfied' : 'Unsatisfied'}`);
    out.addLiteral(node, `${NS.rdfs}comment`, outcome.comment);
    return { node, satisfied: outcome.satisfied };
  }

  function reportSimple(out, type, satisfied, comment) {
    const node = out.newNode();
    out.add(node, RDF_TYPE, `${NS.report}${type}`);
    out.add(node, `${NS.report}satisfactionState`, `${NS.report}${satisfied ? 'Satisfied' : 'Unsatisfied'}`);
    out.addLiteral(node, `${NS.rdfs}comment`, comment);
    return { node, satisfied };
  }

  async function reportParty(ctx, out, assignee) {
    const party = ctx.party;
    if (assignee.termType === 'NamedNode') {
      const member = assignee.equals(party) || ctx.request.getQuads(party, `${NS.odrl}partOf`, assignee, null).length > 0;
      return reportSimple(out, 'PartyReport', member,
        `${show(party)} ${member ? 'is' : 'is not'} (part of) ${show(assignee)}.`);
    }
    // Party collection, possibly with odrl:source and refinements.
    const node = out.newNode();
    out.add(node, RDF_TYPE, `${NS.report}PartyReport`);
    let satisfied = true;
    const source = first(ctx.policy, assignee, `${NS.odrl}source`);
    if (source && ctx.request.getQuads(party, `${NS.odrl}partOf`, source, null).length === 0) {
      satisfied = false;
      out.addLiteral(node, `${NS.rdfs}comment`, `${show(party)} is not part of ${show(source)}.`);
    }
    for (const refinement of objects(ctx.policy, assignee, `${NS.odrl}refinement`)) {
      const sub = await reportConstraint(ctx, out, refinement);
      out.add(node, `${NS.report}premiseReport`, sub.node);
      satisfied &&= sub.satisfied;
    }
    out.add(node, `${NS.report}satisfactionState`, `${NS.report}${satisfied ? 'Satisfied' : 'Unsatisfied'}`);
    return { node, satisfied };
  }

  async function reportPermission(ctx, out, permission) {
    const node = out.newNode();
    out.add(node, RDF_TYPE, `${NS.report}PermissionReport`);
    out.add(node, `${NS.report}rule`, permission);
    out.add(node, `${NS.report}ruleRequest`, ctx.requestNode);
    out.add(node, `${NS.report}attemptState`, `${NS.report}Attempted`);

    const premises = [];
    const targets = objects(ctx.policy, permission, `${NS.odrl}target`);
    const targetOk = targets.some((t) => t.equals(ctx.target));
    premises.push(reportSimple(out, 'TargetReport', targetOk,
      `Requested target ${show(ctx.target)} ${targetOk ? 'matches' : 'does not match'} ${targets.map(show).join(', ')}.`));

    const actions = objects(ctx.policy, permission, `${NS.odrl}action`);
    const actionOk = actions.some((a) => a.equals(ctx.action) || a.value === `${NS.odrl}use`);
    premises.push(reportSimple(out, 'ActionReport', actionOk,
      `Requested action ${show(ctx.action)} ${actionOk ? 'matches' : 'does not match'} ${actions.map(show).join(', ')}.`));

    for (const assignee of objects(ctx.policy, permission, `${NS.odrl}assignee`)) {
      premises.push(await reportParty(ctx, out, assignee));
    }
    for (const constraint of objects(ctx.policy, permission, `${NS.odrl}constraint`)) {
      premises.push(await reportConstraint(ctx, out, constraint));
    }

    premises.forEach((p) => out.add(node, `${NS.report}premiseReport`, p.node));
    const active = premises.every((p) => p.satisfied);
    out.add(node, `${NS.report}activationState`, `${NS.report}${active ? 'Active' : 'Inactive'}`);
    return node;
  }

  function serialize(quads) {
    return new Promise((resolve, reject) => {
      // Group by subject (in order of first appearance) so each subject is written once.
      const bySubject = new Map();
      for (const q of quads) {
        if (!bySubject.has(q.subject.value)) bySubject.set(q.subject.value, []);
        bySubject.get(q.subject.value).push(q);
      }
      const writer = new N3.Writer({ prefixes: NS });
      writer.addQuads([...bySubject.values()].flat());
      writer.end((error, result) => (error ? reject(error) : resolve(result)));
    });
  }

  async function evaluate({ policy, request, sotw, shapes }) {
    const policyStore = parse(policy, 'The ODRL policy');
    const requestStore = parse(request, 'The evaluation request');
    const ctx = {
      policy: policyStore,
      request: requestStore,
      sotw: parse(sotw, 'The State of the World'),
      shapes: parse(shapes, 'The SHACL shapes'),
    };

    const [requestNode] = subjectsOfType(requestStore, `${NS.sotw}EvaluationRequest`);
    if (!requestNode) throw new Error('The evaluation request contains no sotw:EvaluationRequest.');
    ctx.requestNode = requestNode;
    ctx.party = first(requestStore, requestNode, `${NS.sotw}evaluatedParty`);
    ctx.action = first(requestStore, requestNode, `${NS.sotw}evaluatedAction`);
    ctx.target = first(requestStore, requestNode, `${NS.sotw}evaluatedTarget`);
    if (!ctx.party || !ctx.action || !ctx.target) {
      throw new Error('The evaluation request needs sotw:evaluatedParty, sotw:evaluatedAction and sotw:evaluatedTarget.');
    }
    ctx.params = objects(requestStore, requestNode, `${NS.sotw}requestParameter`).map((p) => ({
      feature: first(requestStore, p, `${NS.sotw}describesFeature`),
      value: first(requestStore, p, `${NS.sotw}value`),
    }));

    const policies = POLICY_TYPES.flatMap((type) => subjectsOfType(policyStore, type));
    if (policies.length === 0) throw new Error('The ODRL policy contains no odrl:Policy / odrl:Set / odrl:Offer / odrl:Agreement.');

    const out = reportWriter();
    for (const policyNode of policies) {
      const policyReport = out.newNode();
      out.add(policyReport, RDF_TYPE, `${NS.report}PolicyReport`);
      out.addLiteral(policyReport, `${NS.dct}created`, new Date().toISOString(), `${NS.xsd}dateTime`);
      out.add(policyReport, `${NS.report}policy`, policyNode);
      out.add(policyReport, `${NS.report}policyRequest`, requestNode);
      for (const permission of objects(policyStore, policyNode, `${NS.odrl}permission`)) {
        out.add(policyReport, `${NS.report}ruleReport`, await reportPermission(ctx, out, permission));
      }
    }
    return serialize(out.quads);
  }

  window.OdrlEvaluator = { evaluate };
})();
