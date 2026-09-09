# Pilots Use Case

Related to the [PILOTS ICON project](https://researchportal.vub.be/en/projects/icon-project-pilots-physical-internet-logistics-and-optimized-tra/): Physical Internet Logistics and Optimized Transport Systems

Builds on the publication in [IPIC 2026](https://ipic2026.pi.events/sites/default/files/downloads/IPIC2026_Proceedings.pdf): "Policy-based and Process-Aware Interoperability in the Physical Internet" (page 328 of the proceedings)
by Philippe Michiels, Julián Rojas and Birger Schrevens

## Use Case: automated process-based access control

### High level descriptions

Using state of the art technologies and prototypes, show automated process-based usage control using dynamic roles with input validation.

- Dynamic roles are achieved using [Verifiable Credentials](https://www.w3.org/TR/vc-data-model-2.0/) (VCs) and [Decentralized Identifiers](https://www.w3.org/TR/did-1.0/) (DIDs), both W3C Recommendations.
- Usage control policies are written using the [Open Digital Rights Language](https://www.w3.org/TR/odrl-model) (ODRL) W3C Recommendation and evaluated using the state of the art [ODRL Evaluator](https://w3id.org/force/evaluator) accompagnied with vocabularies ([Evaluation Request](https://w3id.org/force/sotw), [State of the World](https://w3id.org/force/sotw) and [Compliance Report Model](https://w3id.org/force/compliance-report)) endorsed by the [ODRL CG](https://www.w3.org/community/odrl/).
- Input Validation is achieved through the use of the [Shapes Constraint Language](https://www.w3.org/TR/shacl/) (SHACL), a W3C Recommendation

### Scenario 1: Establishing organisational identity

In PILOTS, independent participants collaborate in a federated ecosystem.
In this scenario, we consider two participants: *Van Moer Logistics* and *CertiWeight*.
We use Verifiable Credentials (VCs) and Decentralized Identifiers (DIDs) to demonstrate how Alice can prove that she works for Van Moer Logistics and how Bob can prove that he works for CertiWeight.
Using the aforementioned technologies, there is no need for a central identity provider to establish trust in the affiliation claims.

- Van Moer Logistics DID: `did:jwk:vanmoer`
- CertiWeight DID: `did:jwk:certiweight`
- Alice DID: `did:jwk:alice`
- Bob DID: `did:jwk:bob`

> [!NOTE]
> The dids above are deliberatily simplified for demonstrative purpose. Real jwk dids normally start with `did:jwk:ey...`

Van Moer issues a credential to Alice:
```json
{
  "issuer": "did:jwk:vanmoer",
  "credentialSubject": {
    "id": "did:jwk:alice",
    "memberOf": "Van Moer Logistics"
  }
}
```
CertiWeight issues a Verifiable Credential to Bob:
```json
{
  "issuer": "did:jwk:certiweight",
  "credentialSubject": {
    "id": "did:jwk:bob",
    "memberOf": "CertiWeight"
  }
}
```

#### Proving organisational affiliation

Suppose Alice wants to prove to Bob that she works for Van Moer Logistics.

1. Alice presents the credential issued by Van Moer.
2. Alice creates a Verifiable Presentation (VP) containing the credential.
3. Alice signs the VP using the private key corresponding to `did:jwk:alice`.
4. Bob verifies:
   - the signature on the VP using Alice's DID;
   - the signature on the credential using Van Moer's DID;
   - that the credential subject (`did:jwk:alice`) matches the DID that signed the VP.

If all checks succeed, Bob can conclude:

> The presenter controls `did:jwk:alice`, and Van Moer Logistics asserts that this DID belongs to a member of Van Moer Logistics.

The same process can be used by Bob to prove to Alice that he works for CertiWeight.

### Scenario 2: Establishing the role within a process

TODO: verify with Julian whether that makes sense

Or is this achieved with the description of Scenario 1?

### Scenario 3: Evaluating access request with Input Validation

We build on the previous scenarios, we already established that ...
We now transfer this to the Evaluation Request


> [!NOTE]
> This scenario is based on the paper section 7: Proof-of-Concept: Certified Container Weighing Process. More specifically the **purchaseCertificate** Event

Alice requests on 2025-11-24T11:44.22 to read the weight of a container.



Evaluation Request
```ttl
@prefix ex:      <http://example.com/> .
@prefix odrl:    <http://www.w3.org/ns/odrl/2/> .
@prefix sotw:    <https://w3id.org/force/sotw#> .
@prefix xsd:     <http://www.w3.org/2001/XMLSchema#> .
@prefix pilots:  <https://pilots-project.be/ns#> .

ex:request a sotw:EvaluationRequest ;
    sotw:evaluatedParty <did:jwk:alice> ;
    sotw:evaluatedAction odrl:play ;
    sotw:evaluatedTarget ex:containerWeight ;
    sotw:requestParameter [
        a sotw:RequestParameter ;
        sotw:value "2025-11-24T11:44.22"^^xsd:dateTime ;
        sotw:describesFeature sotw:TemporalData ;
    ], [
        a sotw:RequestParameter ;
        sotw:value pilots:serviceUser ;
        sotw:describesFeature pilots:Role .
    ] .
```

State of the World (well contain some parts to be validated through the SHACL constraint)
```ttl

ex:sotw a sotw:SotW ;
    sotw:context ex:event . TODO: continue event here
```

ODRL Policy
```ttl

```

Point to the ODRL pilots constraint

SHACL resource
```
TODO:
```



## Demonstrator


Let's assume those participants include *imec*, *inuits*, *Van Moer*, *certiWeight* and *Flemish Waterway(FWW)*.
