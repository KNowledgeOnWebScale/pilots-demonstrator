# Pilots Evaluator

## Run it
See demo to play around with it

```ts
npm i
npm run build

npx tsx demo/demo.ts
```

## How does it work?

Two things are added to the evaluator to make it work:
1. a Shape Constraint Validator
2. Two Notation3 rules for the left operand `pilotsProfile:shape`

The Shape Constraint Validator looks for constraints with left operand `pilotsProfile:shape`; their right operand refers to a SHACL shape. 
Before reasoning, the State of the World is validated against each of those shapes (the shapes themselves are given to the evaluator's constructor).
This results in one SHACL validation report per shape, which is added to the input of the reasoner.

The Notation3 rules calculate constraint satisfication for the Left Operand `pilotsProfile:shape`. 
More specifically, it looks at the SHACL report for the right operand it conformance state.
Simply put, if the conformance state is `true`, then the constraintreport is satisfied (and vice versa).

> [!NOTE]
> **Under the hood**: the rules do not set the satisfaction state themselves.
> Like the rules for the ODRL left operands (e.g. `odrl:dateTime`), they only resolve the value of the left operand (`report:constraintLeftOperand`):
> - the shape itself, when its SHACL report has `sh:conforms true`;
> - `""` (no value), when it has `sh:conforms false`.
>
> The existing operator rules of the ODRL Evaluator then compare this value with the right operand.
> With `odrl:eq`, the constraint is satisfied iff the left operand equals the shape, i.e. iff the State of the World conforms to the shape.
> Otherwise, no satisfaction state is derived, and the evaluator marks the constraint report as `report:Unsatisfied`.

Special care is taken when the State of the World contains nothing the shape applies to (no focus node, e.g. no `pilots:ServiceUpdate`).
A SHACL engine then reports conformance, as there is nothing to validate, which is not what we intend.
In that case, the validator adds a violation to the report with an explanatory message. The same happens when the shape is not present in the shapes graph.

> [!NOTE]
> EyeJsReasoner is currently employed to ensure it runs in the browser. In future versions, the configuration should be extended
