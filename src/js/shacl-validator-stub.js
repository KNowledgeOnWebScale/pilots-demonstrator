// STUB SHACL validator, used by the stub ODRL Evaluator for the pilotsProfile:shape left operand.
//
// Replace with a complete SHACL engine (e.g. shacl-engine or rdf-validate-shacl). API:
//
//   ShaclValidator.validate({ data, shapes, focusNode, shapeIri })
//     data, shapes: N3.Store   focusNode: string (IRI)   shapeIri: string (IRI)
//     -> Promise<{ conforms: boolean, results: [{ path?: string, message: string }] }>
//
// Supported: sh:property with an IRI sh:path and sh:minCount, sh:maxCount, sh:nodeKind,
// sh:datatype, sh:hasValue, sh:class. The shape is applied directly to the focus node.
(function () {
  'use strict';

  const SH = 'http://www.w3.org/ns/shacl#';
  const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
  const XSD_STRING = 'http://www.w3.org/2001/XMLSchema#string';

  const objects = (store, subject, predicate) => store.getObjects(subject, predicate, null);
  const first = (store, subject, predicate) => objects(store, subject, predicate)[0];

  const NODE_KINDS = {
    [`${SH}IRI`]: (t) => t.termType === 'NamedNode',
    [`${SH}BlankNode`]: (t) => t.termType === 'BlankNode',
    [`${SH}Literal`]: (t) => t.termType === 'Literal',
    [`${SH}BlankNodeOrIRI`]: (t) => t.termType !== 'Literal',
    [`${SH}BlankNodeOrLiteral`]: (t) => t.termType !== 'NamedNode',
    [`${SH}IRIOrLiteral`]: (t) => t.termType !== 'BlankNode',
  };

  // Each checker returns true when the value set conforms to the constraint.
  const CONSTRAINTS = {
    minCount: (values, param) => values.length >= Number(param.value),
    maxCount: (values, param) => values.length <= Number(param.value),
    nodeKind: (values, param) => values.every((v) => NODE_KINDS[param.value]?.(v)),
    datatype: (values, param) => values.every((v) =>
      v.termType === 'Literal' && (v.datatype?.value ?? XSD_STRING) === param.value),
    hasValue: (values, param) => values.some((v) => v.equals(param)),
    class: (values, param, data) => values.every((v) =>
      data.getQuads(v, RDF_TYPE, param, null).length > 0),
  };

  const shorten = (iri) => iri.replace(/^.*[#/]/, '');

  async function validate({ data, shapes, focusNode, shapeIri }) {
    if (shapes.getQuads(shapeIri, null, null, null).length === 0) {
      return { conforms: false, results: [{ message: `Shape <${shapeIri}> was not found in the shapes graph.` }] };
    }
    const results = [];
    for (const property of objects(shapes, shapeIri, `${SH}property`)) {
      const path = first(shapes, property, `${SH}path`);
      if (!path || path.termType !== 'NamedNode') {
        results.push({ message: 'Stub validator only supports IRI property paths.' });
        continue;
      }
      const values = data.getObjects(focusNode, path, null);
      const message = first(shapes, property, `${SH}message`)?.value;
      for (const [name, check] of Object.entries(CONSTRAINTS)) {
        const param = first(shapes, property, `${SH}${name}`);
        if (param && !check(values, param, data)) {
          results.push({
            path: path.value,
            message: message ?? `Value(s) of ${shorten(path.value)} violate sh:${name} ${shorten(param.value)}.`,
          });
          break; // one result per property shape is enough for the demo
        }
      }
    }
    return { conforms: results.length === 0, results };
  }

  window.ShaclValidator = { validate };
})();
