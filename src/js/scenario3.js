// Scenario 3: evaluating an access request with input validation (standalone).
// An ES module bundled with webpack (npm run build), as it uses the PILOTS ODRL Evaluator.
import { Parser, Store, Writer } from 'n3';
import { parseSingleComplianceReport, PilotsODRLEvaluator, prefixes, PILOT_SHAPES } from 'pilots-odrl-evaluator';

const REQUEST = `@prefix ex:      <http://example.com/> .
@prefix odrl:    <http://www.w3.org/ns/odrl/2/> .
@prefix dpv:     <https://w3id.org/dpv#> .
@prefix sotw:    <https://w3id.org/force/sotw#> .
@prefix xsd:     <http://www.w3.org/2001/XMLSchema#> .
@prefix pilots:  <https://pilots-project.be/ns#> .

ex:request a sotw:EvaluationRequest ;
    sotw:evaluatedParty <did:jwk:alice> ;
    sotw:evaluatedAction odrl:read ;
    sotw:evaluatedTarget ex:containerWeight ;
    sotw:requestParameter [
        a sotw:RequestParameter ;
        sotw:value "2025-11-24T11:44:22"^^xsd:dateTime ;
        sotw:describesFeature sotw:TemporalData
    ], [
        a sotw:RequestParameter ;
        sotw:value dpv:ServiceConsumer ; # similar to pilots:serviceUser
        sotw:describesFeature pilots:actorRole # defined in the IPIC paper
    ] .

<did:jwk:vanmoer> a odrl:PartyCollection .
<did:jwk:alice> odrl:partOf <did:jwk:vanmoer> .
`;

const EVENT = `ex:event a pilots:ServiceUpdate, pilots:purchaseCertificate ;
    pilots:serviceDefinitionId pilots:WeighingServiceDescription ;
    pilots:serviceInstanceId <urn:uuid:3977d047-322c-4fa9-8f23-7074aa154284> ;
    pilots:previousState pilots:certificateCreated ;
    pilots:newState pilots:certificatePurchased ;
    pilots:paymentReference ex:payment ;
    dct:issued "2025-11-24T11:44:22"^^xsd:dateTime .
`;

const PAYMENT = `ex:payment a pay:Payment ;
    pay:payer <did:jwk:vanmoer> ;
    pay:payee <did:jwk:certiweight> ;
    pay:transactionId "paymentTransactionID" ;
    pay:paymentDate "2025-11-23T11:30:00"^^xsd:dateTime ;
    pay:netAmount "100.00"^^xsd:decimal ;
    pay:currency "EUR" .
`;

const sotw = ({ context = 'ex:event, ex:payment', event = EVENT, extra = '' } = {}) => `@prefix ex:      <http://example.com/> .
@prefix dct:     <http://purl.org/dc/terms/> .
@prefix sotw:    <https://w3id.org/force/sotw#> .
@prefix pilots:  <https://pilots-project.be/ns#> .
@prefix pay:     <https://reference.data.gov.uk/def/payment#> .
@prefix xsd:     <http://www.w3.org/2001/XMLSchema#> .

ex:sotw a sotw:SotW ;
    sotw:context ${context} .

${event}${extra}
${PAYMENT}`;

const POLICY = `@prefix ex:      <http://example.com/> .
@prefix odrl:    <http://www.w3.org/ns/odrl/2/> .
@prefix dpv:     <https://w3id.org/dpv#> .
@prefix pilots:  <https://pilots-project.be/ns#> .
@prefix pilotsProfile:  <https://pilots-project.be/odrlProfile/> .

ex:pilotsPolicy a odrl:Set ; # odrl:Set because the policy does not identify an assigner
    odrl:profile <https://pilots-project.be/odrlProfile/> ;
    odrl:permission ex:purchaseCertificatePermission .

ex:purchaseCertificatePermission a odrl:Permission ;
    odrl:target ex:containerWeight ;
    odrl:assignee <did:jwk:vanmoer> ; # TODO: party collection with the role refinement (pilotsProfile:role, next iteration)
    odrl:action odrl:read ;
    odrl:constraint ex:eventConstraint .

ex:eventConstraint a odrl:Constraint ;
    odrl:leftOperand pilotsProfile:shape ;
    odrl:operator odrl:eq ;
    odrl:rightOperand pilots:PilotsEventShape .
`;

const STRICT_POLICY = POLICY.replace('pilots:PilotsEventShape', 'pilots:PurchaseCertificateShape');
const WRONG_STATE_EVENT = EVENT
  .replace('pilots:previousState pilots:certificateCreated', 'pilots:previousState pilots:certificateRequested');
const SECOND_EVENT = `
ex:event2 a pilots:ServiceUpdate ;
    pilots:serviceDefinitionId pilots:WeighingServiceDescription ;
    pilots:serviceInstanceId <urn:uuid:3977d047-322c-4fa9-8f23-7074aa154284> ;
    pilots:previousState pilots:weighingRequested ;
    pilots:newState pilots:certificateCreated ;
    dct:issued "2025-11-24T10:02:00"^^xsd:dateTime .
`;

const cases = [
  {
    id: 'happy',
    label: 'Alice (ServiceConsumer) reads the container weight after purchase',
    description: 'The preloaded happy path from the README.',
    expected: 'access granted',
  },
  {
    id: 'no-event',
    label: '✘ No event in the State of the World',
    description: 'The SotW only contains the payment, no pilots:ServiceUpdate event.',
    expected: 'access denied (shape constraint unsatisfied)',
    sotw: sotw({ context: 'ex:payment', event: '' }),
  },
  {
    id: 'incomplete-event',
    label: '✘ Incomplete event (no issued timestamp)',
    description: 'The purchaseCertificate event lacks dct:issued, required by pilots:PilotsEventShape.',
    expected: 'access denied (shape constraint unsatisfied)',
    sotw: sotw({ event: EVENT.replace(' ;\n    dct:issued "2025-11-24T11:44:22"^^xsd:dateTime .', ' .') }),
  },
  {
    id: 'two-events',
    label: 'Two events in the State of the World, both valid',
    description: 'The earlier certificateCreated event is included as well. Every pilots:ServiceUpdate must conform to pilots:PilotsEventShape, and both do.',
    expected: 'access granted',
    sotw: sotw({ context: 'ex:event, ex:event2, ex:payment', extra: SECOND_EVENT }),
  },
  // TODO (next iteration, pilotsProfile:role): role claim missing from the request; requester acts as ServiceProvider
  {
    id: 'wrong-action',
    label: '✘ Alice wants to modify the container weight',
    description: 'The request asks for odrl:modify; the policy only permits odrl:read.',
    expected: 'access denied (action mismatch)',
    request: REQUEST.replace('sotw:requestedAction odrl:read', 'sotw:requestedAction odrl:modify'),
  },
  {
    id: 'strict-happy',
    label: 'Stricter policy: event validated against PurchaseCertificateShape',
    description: 'The policy requires the event to conform to pilots:PurchaseCertificateShape (correct state transition and payment reference).',
    expected: 'access granted',
    policy: STRICT_POLICY,
  },
  {
    id: 'wrong-state-general',
    label: '⚠ Wrong state transition, general shape only',
    description: 'previousState is certificateRequested instead of certificateCreated. pilots:PilotsEventShape does not check states (see README open issues).',
    expected: 'access granted (the general shape cannot detect this)',
    sotw: sotw({ event: WRONG_STATE_EVENT }),
  },
  {
    id: 'wrong-state-strict',
    label: '✘ Wrong state transition, PurchaseCertificateShape',
    description: 'Same event with previousState certificateRequested, now validated against pilots:PurchaseCertificateShape.',
    expected: 'access denied (shape constraint unsatisfied)',
    policy: STRICT_POLICY,
    sotw: sotw({ event: WRONG_STATE_EVENT }),
  },
  {
    id: 'no-payment-strict',
    label: '✘ Missing payment reference, PurchaseCertificateShape',
    description: 'The event has no pilots:paymentReference, so the certificate was not paid for.',
    expected: 'access denied (shape constraint unsatisfied)',
    policy: STRICT_POLICY,
    sotw: sotw({ event: EVENT.replace('    pilots:paymentReference ex:payment ;\n', '') }),
  },
].map((c) => ({
  ...c,
  inputs: {
    's3-request': c.request ?? REQUEST,
    's3-policy': c.policy ?? POLICY,
    's3-sotw': c.sotw ?? sotw(),
    's3-shapes': c.shapes ?? PILOT_SHAPES,
  },
}));

const { el } = Demo;

const R = 'https://w3id.org/force/compliance-report#';
const SH = 'http://www.w3.org/ns/shacl#';
const SHACL_REPORT = 'https://pilots-project.be/odrlProfile/shaclReport';
const LABELS = { TargetReport: 'Target', ActionReport: 'Action', PartyReport: 'Assignee', ConstraintReport: 'Constraint' };
const local = (iri) => iri.replace(/^.*[#/]/, '');
const parse = (text) => new Parser().parse(text);

async function evaluate({ policy, request, sotw, shapes }) {
  const evaluator = new PilotsODRLEvaluator({ shapes: parse(shapes) });
  return evaluator.evaluate(parse(policy), parse(request), parse(sotw));
}

// Yes/no guidance from the compliance report (parsed with the ODRL Evaluator).
// For pilotsProfile:shape constraints, the messages of the referenced SHACL report explain the outcome.
function interpret(report) {
  const policyReport = parseSingleComplianceReport(report);
  const store = new Store(report);
  const shaclMessages = (premiseReport) => store.getObjects(premiseReport.id, SHACL_REPORT, null)
    .flatMap((shaclReport) => store.getObjects(shaclReport, `${SH}result`, null))
    .flatMap((result) => store.getObjects(result, `${SH}resultMessage`, null))
    .map((message) => message.value);

  const premise = (premiseReport) => ({
    label: `${LABELS[local(premiseReport.type)] ?? local(premiseReport.type)}${premiseReport.constraint ? ` ${local(premiseReport.constraint.value)}` : ''}`,
    passed: premiseReport.satisfactionState === `${R}Satisfied`,
    detail: shaclMessages(premiseReport).join(' '),
    premises: premiseReport.premiseReport.map(premise),
  });
  const rules = policyReport.ruleReport.map((ruleReport) => ({
    rule: ruleReport.rule?.value,
    type: local(ruleReport.type),
    attempted: ruleReport.attemptState === `${R}Attempted`,
    active: ruleReport.activationState === `${R}Active`,
    premises: ruleReport.premiseReport.map(premise),
  }));
  const permitted = rules.some((r) => r.type === 'PermissionReport' && r.attempted && r.active);
  const prohibited = rules.some((r) => r.type === 'ProhibitionReport' && r.attempted && r.active);
  return { granted: permitted && !prohibited, rules };
}

function premiseList(premises) {
  return el('ul', { class: 'checks' }, premises.map((p) =>
    el('li', { class: p.passed ? 'check-pass' : 'check-fail' },
      el('span', { class: 'check-icon', text: p.passed ? '✔' : '✘' }),
      el('span', {},
        el('strong', { text: p.label }),
        p.detail ? el('br') : null,
        p.detail ? el('small', { text: p.detail }) : null,
        p.premises.length ? premiseList(p.premises) : null,
      ),
    ),
  ));
}

function renderGuidance(container, { granted, rules }) {
  container.replaceChildren(
    el('article', { class: `verdict ${granted ? 'verdict-yes' : 'verdict-no'}` },
      el('h4', { text: granted ? 'Access granted: yes' : 'Access granted: no' }),
      el('p', { text: granted
        ? 'An attempted permission is active: every premise (target, action, assignee and constraints) is satisfied.'
        : 'No attempted permission is active. The unsatisfied premises below explain why.' }),
    ),
    ...rules.map((rule) => el('section', {},
      el('p', {},
        el('strong', { text: `${rule.type.replace('Report', '')} ${rule.rule?.replace(/^.*[#/]/, '') ?? ''}` }),
        ` is ${rule.active ? 'active' : 'inactive'}.`,
      ),
      premiseList(rule.premises),
    )),
  );
}

function init() {
  const guidance = document.getElementById('s3-guidance');
  const output = document.getElementById('s3-report');
  const reset = () => { guidance.replaceChildren(); output.textContent = ''; };
  Demo.bindTestCases({
    select: document.getElementById('s3-case'),
    info: document.getElementById('s3-info'),
    cases,
    onLoad: reset,
  });

  const button = document.getElementById('s3-evaluate');
  button.addEventListener('click', () => Demo.withBusy(button, async () => {
    reset();
    try {
      console.log(document.getElementById('s3-request').value)
      const report = await evaluate({
        request: document.getElementById('s3-request').value,
        policy: document.getElementById('s3-policy').value,
        sotw: document.getElementById('s3-sotw').value,
        shapes: document.getElementById('s3-shapes').value,
      });
      output.textContent = new Writer({ prefixes }).quadsToString(report);
      renderGuidance(guidance, interpret(report));
    } catch (error) {
      Demo.renderError(guidance, error.message);
    }
  }));
}

document.addEventListener('DOMContentLoaded', init);