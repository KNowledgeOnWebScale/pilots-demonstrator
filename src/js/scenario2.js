// Scenario 2: establishing the role within a process (standalone).
(function () {
  'use strict';

  const { sign } = window.StubSigner;
  const json = (value) => JSON.stringify(value, null, 2);

  const didDocument = (did) => ({
    id: did,
    verificationMethod: [{
      id: `${did}#0`,
      type: 'JsonWebKey',
      controller: did,
      publicKeyJwk: { kty: 'OKP', crv: 'Ed25519', x: `stub-key-${did.split(':').pop()}` },
    }],
  });

  const DID_DOCUMENTS = Object.fromEntries(
    ['did:jwk:vanmoer', 'did:jwk:certiweight', 'did:jwk:alice', 'did:jwk:bob'].map((did) => [did, didDocument(did)]),
  );

  const VAN_MOER = { organisation: 'did:jwk:vanmoer', name: 'Van Moer Logistics', mayAssign: ['dpv:ServiceConsumer'] };
  const CERTIWEIGHT = { organisation: 'did:jwk:certiweight', name: 'CertiWeight', mayAssign: ['dpv:ServiceProvider'] };

  const governance = (...authorisations) => ({
    authority: 'Governance Authority (observer)',
    process: 'Certified container weighing',
    authorisations,
  });
  const GOVERNANCE = governance(VAN_MOER, CERTIWEIGHT);

  function roleCredential(issuer, subject, role, { keyOwner } = {}) {
    return sign({
      '@context': ['https://www.w3.org/ns/credentials/v2', { dpv: 'https://w3id.org/dpv#' }],
      type: ['VerifiableCredential', 'ProcessRoleCredential'],
      issuer,
      validFrom: '2025-01-01T00:00:00Z',
      validUntil: '2030-12-31T23:59:59Z',
      credentialSubject: { id: subject, role },
    }, issuer, 'assertionMethod', keyOwner);
  }

  function presentation(holder, credential, { keyOwner } = {}) {
    return sign({
      '@context': ['https://www.w3.org/ns/credentials/v2'],
      type: ['VerifiablePresentation'],
      holder,
      verifiableCredential: [credential],
    }, holder, 'authentication', keyOwner);
  }

  const aliceConsumer = roleCredential('did:jwk:vanmoer', 'did:jwk:alice', 'dpv:ServiceConsumer');

  const cases = [
    {
      id: 'alice-consumer',
      label: 'Alice proves she acts as dpv:ServiceConsumer',
      description: 'Van Moer issued Alice a ServiceConsumer role credential; the governance framework allows Van Moer to assign that role.',
      expected: 'verified',
      presentation: presentation('did:jwk:alice', aliceConsumer),
    },
    {
      id: 'bob-provider',
      label: 'Bob proves he acts as dpv:ServiceProvider',
      description: 'CertiWeight issued Bob a ServiceProvider role credential; the governance framework allows CertiWeight to assign that role.',
      expected: 'verified',
      presentation: presentation('did:jwk:bob', roleCredential('did:jwk:certiweight', 'did:jwk:bob', 'dpv:ServiceProvider')),
    },
    {
      id: 'vanmoer-assigns-provider',
      label: '✘ Van Moer assigns Alice the ServiceProvider role',
      description: 'The credential is validly signed, but Van Moer is only authorised to assign dpv:ServiceConsumer.',
      expected: 'rejected (issuer not authorised for this role)',
      presentation: presentation('did:jwk:alice', roleCredential('did:jwk:vanmoer', 'did:jwk:alice', 'dpv:ServiceProvider')),
    },
    {
      id: 'certiweight-assigns-consumer',
      label: '✘ CertiWeight assigns Alice the ServiceConsumer role',
      description: 'CertiWeight issues a ServiceConsumer credential to Alice, but it is only authorised to assign dpv:ServiceProvider.',
      expected: 'rejected (issuer not authorised for this role)',
      presentation: presentation('did:jwk:alice', roleCredential('did:jwk:certiweight', 'did:jwk:alice', 'dpv:ServiceConsumer')),
    },
    {
      id: 'vanmoer-not-recognised',
      label: '✘ Van Moer is no longer recognised by the governance authority',
      description: "Alice's credential is valid, but the governance framework no longer lists Van Moer Logistics.",
      expected: 'rejected (issuer not recognised)',
      presentation: presentation('did:jwk:alice', aliceConsumer),
      governance: governance(CERTIWEIGHT),
    },
    {
      id: 'tampered-role',
      label: '✘ Alice upgraded her role to ServiceProvider',
      description: 'After issuance, Alice changed the role in her credential to dpv:ServiceProvider and re-signed only the VP.',
      expected: 'rejected (VC signature invalid, issuer not authorised)',
      presentation: presentation('did:jwk:alice', {
        ...aliceConsumer,
        credentialSubject: { ...aliceConsumer.credentialSubject, role: 'dpv:ServiceProvider' },
      }),
    },
    {
      id: 'forged-presentation',
      label: '✘ Mallory pretends to be Alice',
      description: "Mallory obtained Alice's role credential and signs a VP as did:jwk:alice with her own key.",
      expected: 'rejected (VP signature invalid)',
      presentation: presentation('did:jwk:alice', aliceConsumer, { keyOwner: 'did:jwk:mallory' }),
    },
  ].map((c) => ({
    ...c,
    inputs: {
      's2-presentation': json(c.presentation),
      's2-dids': json(DID_DOCUMENTS),
      's2-governance': json(c.governance ?? GOVERNANCE),
    },
  }));

  function init() {
    const result = document.getElementById('s2-result');
    Demo.bindTestCases({
      select: document.getElementById('s2-case'),
      info: document.getElementById('s2-info'),
      cases,
      onLoad: () => result.replaceChildren(),
    });

    const button = document.getElementById('s2-verify');
    button.addEventListener('click', () => Demo.withBusy(button, async () => {
      let input;
      try {
        input = {
          presentation: JSON.parse(document.getElementById('s2-presentation').value),
          didDocuments: JSON.parse(document.getElementById('s2-dids').value),
          governance: JSON.parse(document.getElementById('s2-governance').value),
        };
      } catch (error) {
        return Demo.renderError(result, `Invalid JSON: ${error.message}`);
      }
      const outcome = await CredentialVerifier.verifyRole(input);
      Demo.renderChecks(result, { ...outcome, verdict: outcome.passed ? 'Process role verified' : 'Process role not verified' });
    }));
  }

  document.addEventListener('DOMContentLoaded', init);
})();
