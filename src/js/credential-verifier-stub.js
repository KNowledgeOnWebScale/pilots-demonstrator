// STUB Credential Verifier (scenarios 1 and 2).
//
// Replace this file with an implementation backed by real DID resolution and
// VC/VP proof verification (e.g. the EDC IdentityHub). The public API is:
//
//   CredentialVerifier.verifyAffiliation({ presentation, didDocuments, organisations })
//   CredentialVerifier.verifyRole({ presentation, didDocuments, governance })
//
// Both return Promise<{ passed: boolean, checks: Check[], conclusion?: string }>
// with Check = { label: string, passed: boolean | null, detail?: string }
// (passed === null means the check could not be performed).
//
// The "cryptography" below is fake: a proof value is a non-cryptographic hash of
// the signed document and a key string. It only makes tampering visible in the demo.
(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Stub key material. In the stub, the public key in the DID document equals the
  // "private" key used for signing. Mallory is an attacker absent from the DID resolver.
  // ---------------------------------------------------------------------------
  const STUB_PRIVATE_KEYS = {
    'did:jwk:vanmoer': 'stub-key-vanmoer',
    'did:jwk:certiweight': 'stub-key-certiweight',
    'did:jwk:alice': 'stub-key-alice',
    'did:jwk:bob': 'stub-key-bob',
    'did:jwk:mallory': 'stub-key-mallory',
  };

  function canonicalize(value) {
    if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
    if (value && typeof value === 'object') {
      return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${canonicalize(value[k])}`).join(',')}}`;
    }
    return JSON.stringify(value);
  }

  // Two FNV-1a passes with different seeds, for a 64-bit looking digest.
  function stubDigest(text) {
    const pass = (seed) => {
      let h = seed >>> 0;
      for (let i = 0; i < text.length; i++) {
        h ^= text.charCodeAt(i);
        h = Math.imul(h, 0x01000193) >>> 0;
      }
      return h.toString(16).padStart(8, '0');
    };
    return pass(0x811c9dc5) + pass(0x1b873593);
  }

  function signingInput(document, proof) {
    const { proof: _ignored, ...unsigned } = document;
    const { proofValue: _value, ...proofOptions } = proof;
    return canonicalize(unsigned) + canonicalize(proofOptions);
  }

  function computeProofValue(document, proof, key) {
    return `zStub${stubDigest(key + '|' + signingInput(document, proof))}`;
  }

  // Signs `document` claiming `claimedDid`, using the key of `keyOwnerDid`
  // (defaults to the claimed DID; differs only to build forged test cases).
  function sign(document, claimedDid, proofPurpose, keyOwnerDid = claimedDid) {
    const proof = {
      type: 'DataIntegrityProof',
      cryptosuite: 'stub-fnv1a-2026',
      created: '2025-11-24T09:00:00Z',
      verificationMethod: `${claimedDid}#0`,
      proofPurpose,
    };
    proof.proofValue = computeProofValue(document, proof, STUB_PRIVATE_KEYS[keyOwnerDid]);
    return { ...document, proof };
  }

  // ---------------------------------------------------------------------------
  // Stub DID resolution: looks the DID up in the (editable) DID document registry.
  // ---------------------------------------------------------------------------
  async function resolveDid(did, didDocuments) {
    const doc = didDocuments[did];
    if (!doc) throw new Error(`DID ${did} could not be resolved.`);
    return doc;
  }

  function didOf(verificationMethod) {
    return String(verificationMethod ?? '').split('#')[0];
  }

  async function verifyProof(document, expectedDid, didDocuments) {
    const proof = document?.proof;
    if (!proof?.proofValue || !proof.verificationMethod) {
      return { passed: false, detail: 'No proof (or no proofValue / verificationMethod) present.' };
    }
    const signer = didOf(proof.verificationMethod);
    if (signer !== expectedDid) {
      return { passed: false, detail: `Proof is made by ${signer}, expected ${expectedDid}.` };
    }
    let didDocument;
    try {
      didDocument = await resolveDid(signer, didDocuments);
    } catch (error) {
      return { passed: false, detail: error.message };
    }
    const method = (didDocument.verificationMethod ?? []).find((m) => m.id === proof.verificationMethod);
    if (!method) {
      return { passed: false, detail: `DID document of ${signer} has no verification method ${proof.verificationMethod}.` };
    }
    const expected = computeProofValue(document, proof, method.publicKeyJwk?.x);
    return expected === proof.proofValue
      ? { passed: true, detail: `Signature verified with ${proof.verificationMethod}.` }
      : { passed: false, detail: `Signature does not match the key of ${proof.verificationMethod} (document tampered with or signed with another key).` };
  }

  function checkValidityPeriod(credential, now = new Date()) {
    const from = credential.validFrom ? new Date(credential.validFrom) : null;
    const until = credential.validUntil ? new Date(credential.validUntil) : null;
    if (from && now < from) return { passed: false, detail: `Credential is only valid from ${credential.validFrom}.` };
    if (until && now > until) return { passed: false, detail: `Credential expired on ${credential.validUntil}.` };
    return { passed: true, detail: `Valid from ${credential.validFrom ?? '(unspecified)'} until ${credential.validUntil ?? '(unspecified)'}.` };
  }

  // Checks common to scenario 1 and 2. Returns the checks and the extracted credential.
  async function verifyPresentation(presentation, didDocuments) {
    const checks = [];
    const types = [].concat(presentation?.type ?? []);
    const credentials = [].concat(presentation?.verifiableCredential ?? []);
    const wellFormed = types.includes('VerifiablePresentation') && presentation.holder && credentials.length === 1;
    checks.push({
      label: 'Presentation is well-formed',
      passed: Boolean(wellFormed),
      detail: wellFormed
        ? `Holder ${presentation.holder} presents one credential.`
        : 'Expected a VerifiablePresentation with a holder and exactly one verifiableCredential.',
    });
    if (!wellFormed) return { checks, credential: null };

    const credential = credentials[0];
    const holder = presentation.holder;

    checks.push({ label: "VP signature is valid for the presenter's DID", ...(await verifyProof(presentation, holder, didDocuments)) });
    checks.push({ label: "VC signature is valid for the issuer's DID", ...(await verifyProof(credential, credential.issuer, didDocuments)) });

    const subject = credential.credentialSubject?.id;
    checks.push({
      label: 'Credential subject matches the DID that signed the VP',
      passed: subject === holder,
      detail: subject === holder ? `Subject ${subject} is the presenter.` : `Subject ${subject ?? '(none)'} ≠ presenter ${holder}.`,
    });
    checks.push({ label: 'Credential is within its validity period', ...checkValidityPeriod(credential) });
    return { checks, credential };
  }

  // Scenario 1: proving organisational affiliation.
  // organisations: { [did]: { name } } — the verifier's knowledge of participant DIDs.
  async function verifyAffiliation({ presentation, didDocuments, organisations }) {
    const { checks, credential } = await verifyPresentation(presentation, didDocuments);
    if (credential) {
      const claimed = credential.credentialSubject?.memberOf;
      const issuerName = organisations[credential.issuer]?.name;
      const passed = Boolean(claimed) && issuerName === claimed;
      checks.push({
        label: 'Issuer is the organisation the affiliation is claimed for',
        passed,
        detail: !claimed
          ? 'Credential has no memberOf claim.'
          : issuerName
            ? `Issuer ${credential.issuer} is known as "${issuerName}"; claim is memberOf "${claimed}".`
            : `Issuer ${credential.issuer} is not a known organisation, so it cannot vouch for membership of "${claimed}".`,
      });
    }
    const passed = checks.every((c) => c.passed);
    return {
      passed,
      checks,
      conclusion: passed
        ? `The presenter controls ${presentation.holder}, and ${organisations[credential.issuer].name} asserts that this DID belongs to a member of ${credential.credentialSubject.memberOf}.`
        : undefined,
    };
  }

  // Scenario 2: proving a process role.
  // governance: { authorisations: [{ organisation, name, mayAssign: [role] }] }
  async function verifyRole({ presentation, didDocuments, governance }) {
    const { checks, credential } = await verifyPresentation(presentation, didDocuments);
    let entry;
    if (credential) {
      const role = credential.credentialSubject?.role;
      entry = (governance.authorisations ?? []).find((a) => a.organisation === credential.issuer);
      const passed = Boolean(role) && Boolean(entry?.mayAssign?.includes(role));
      checks.push({
        label: 'Governance framework authorises the issuer to assign this role',
        passed,
        detail: !role
          ? 'Credential has no role claim.'
          : !entry
            ? `Issuer ${credential.issuer} is not recognised by the governance framework.`
            : passed
              ? `${entry.name} may assign ${role}.`
              : `${entry.name} may only assign ${(entry.mayAssign ?? []).join(', ') || 'no roles'}, not ${role}.`,
      });
    }
    const passed = checks.every((c) => c.passed);
    return {
      passed,
      checks,
      conclusion: passed
        ? `The presenter controls ${presentation.holder}, and ${entry.name} asserts that this DID is authorised to act as a ${credential.credentialSubject.role}, and the governance framework authorises ${entry.name} to assign that role.`
        : undefined,
    };
  }

  window.CredentialVerifier = { verifyAffiliation, verifyRole };
  // Only used to build the demo's test data; not part of the verifier API.
  window.StubSigner = { sign };
})();
