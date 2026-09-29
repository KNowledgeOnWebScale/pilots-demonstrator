// Scenario 1: establishing organisational identity (standalone).
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

  const ORGANISATIONS = {
    'did:jwk:vanmoer': { name: 'Van Moer Logistics' },
    'did:jwk:certiweight': { name: 'CertiWeight' },
  };

  function affiliationCredential(issuer, subject, memberOf, { validUntil = '2030-12-31T23:59:59Z', keyOwner } = {}) {
    return sign({
      '@context': ['https://www.w3.org/ns/credentials/v2'],
      type: ['VerifiableCredential', 'AffiliationCredential'],
      issuer,
      validFrom: '2025-01-01T00:00:00Z',
      validUntil,
      credentialSubject: { id: subject, memberOf },
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

  const aliceCredential = affiliationCredential('did:jwk:vanmoer', 'did:jwk:alice', 'Van Moer Logistics');
  const tamperedCredential = {
    ...aliceCredential,
    credentialSubject: { ...aliceCredential.credentialSubject, memberOf: 'CertiWeight' },
  };

  const cases = [
    {
      id: 'alice-vanmoer',
      label: 'Alice proves she works for Van Moer Logistics',
      description: 'Alice presents the affiliation credential issued by Van Moer in a VP signed with her own key.',
      expected: 'verified',
      presentation: presentation('did:jwk:alice', aliceCredential),
    },
    {
      id: 'bob-certiweight',
      label: 'Bob proves he works for CertiWeight',
      description: 'Bob presents the affiliation credential issued by CertiWeight in a VP signed with his own key.',
      expected: 'verified',
      presentation: presentation('did:jwk:bob',
        affiliationCredential('did:jwk:certiweight', 'did:jwk:bob', 'CertiWeight')),
    },
    {
      id: 'tampered-claim',
      label: '✘ Alice altered the credential to claim CertiWeight',
      description: 'After issuance, Alice changed memberOf to "CertiWeight" and re-signed only the VP.',
      expected: 'rejected (VC signature invalid, issuer does not match claim)',
      presentation: presentation('did:jwk:alice', tamperedCredential),
    },
    {
      id: 'forged-presentation',
      label: '✘ Mallory pretends to be Alice',
      description: "Mallory obtained Alice's credential and signs a VP claiming to be did:jwk:alice, but with her own key.",
      expected: 'rejected (VP signature invalid)',
      presentation: presentation('did:jwk:alice', aliceCredential, { keyOwner: 'did:jwk:mallory' }),
    },
    {
      id: 'someone-elses-credential',
      label: "✘ Bob presents Alice's credential",
      description: "Bob signs a valid VP with his own key, but it contains Alice's affiliation credential.",
      expected: 'rejected (credential subject does not match presenter)',
      presentation: presentation('did:jwk:bob', aliceCredential),
    },
    {
      id: 'self-issued',
      label: '✘ Alice issues her own affiliation credential',
      description: 'Alice signs a credential stating she is a member of Van Moer Logistics herself. All signatures are valid.',
      expected: 'rejected (issuer is not the claimed organisation)',
      presentation: presentation('did:jwk:alice',
        affiliationCredential('did:jwk:alice', 'did:jwk:alice', 'Van Moer Logistics')),
    },
    {
      id: 'expired',
      label: '✘ Alice presents an expired credential',
      description: 'The affiliation credential issued by Van Moer expired at the end of 2025.',
      expected: 'rejected (credential expired)',
      presentation: presentation('did:jwk:alice',
        affiliationCredential('did:jwk:vanmoer', 'did:jwk:alice', 'Van Moer Logistics', { validUntil: '2025-12-31T23:59:59Z' })),
    },
  ].map((c) => ({
    ...c,
    inputs: { 's1-presentation': json(c.presentation), 's1-dids': json(DID_DOCUMENTS), 's1-orgs': json(ORGANISATIONS) },
  }));

  function init() {
    const result = document.getElementById('s1-result');
    Demo.bindTestCases({
      select: document.getElementById('s1-case'),
      info: document.getElementById('s1-info'),
      cases,
      onLoad: () => result.replaceChildren(),
    });

    const button = document.getElementById('s1-verify');
    button.addEventListener('click', () => Demo.withBusy(button, async () => {
      let input;
      try {
        input = {
          presentation: JSON.parse(document.getElementById('s1-presentation').value),
          didDocuments: JSON.parse(document.getElementById('s1-dids').value),
          organisations: JSON.parse(document.getElementById('s1-orgs').value),
        };
      } catch (error) {
        return Demo.renderError(result, `Invalid JSON: ${error.message}`);
      }
      const outcome = await CredentialVerifier.verifyAffiliation(input);
      Demo.renderChecks(result, { ...outcome, verdict: outcome.passed ? 'Affiliation verified' : 'Affiliation not verified' });
    }));
  }

  document.addEventListener('DOMContentLoaded', init);
})();
