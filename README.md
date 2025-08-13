# conductor

Source Academy standard communication interface for languages

## Terminology

- Host: An environment from which Runners may be created, e.g. browser, CLI.
- Runner: An environment where user code is run.
- Evaluator: A program that processes user code and produces the result(s).
- Channel: A named bidirectional data stream between a Host and a Runner.
- Chunk: A piece of user code that is not associated with any file.
  This is usually strings from REPL, but contents of files can also be treated as chunks if there is no distinction to be made.
- Plugin: A program that provides additional functionality, loaded on demand;
  it may receive communications and communicate on declared Channels.

## Implementing a new language

To get started, use the `conductor-runner-example` template. It contains a basic evaluator that calls Javascript's `eval` on the provided chunks.

### The IEvaluator interface

To implement a new language using Conductor, implement the `conductor/runner/types/IEvaluator` interface.
This allows Conductor to interact with the language's implementation in a standard manner.

The `conductor/runner/BasicEvaluator` abstract class provides a basic implementation of this interface;
to use, implement `evaluateChunk` and override `evaluateFile` if needed.

### The entry point

An entry point should be created; this is the file initially executed to start a Runner.
It should construct an instance of `Conduit`, and register the `RunnerPlugin` with an argument of the evaluator.
`conductor/runner/util/initialise` can help with this (do `initialise(MyEvaluator)`).

Your implementation should be bundled using this file as the bundler's entry point.

### Language data

This is used by the host to locate your runner and execute it.
It should contain things like the path to your entry point, editor information, and other information about your language.
Consult `sa-languages` repository for more information. (TODO)

## Module interface

### Data types

Several standard data types are available for module-language interfacing.
Some are passed directly as JS values, others as identifiers. See `conductor/types/DataType`.
Note that all identifiers across data types must be unique - in other words, a raw identifier must be able to be mapped back to the correct data.

| Data type    | Passed as  | Notes                                                         |
| ------------ | ---------- | ------------------------------------------------------------- |
| void         | none\*     | The return type for functions with no return value            |
| boolean      | JS value   |                                                               |
| number       | JS value   | Per JS limitations, this is IEEE754 binary64 (`double` in C)  |
| const string | JS value   | Strings are immutable                                         |
| empty list   | none\*     | The empty-list value                                          |
| pair         | Identifier |                                                               |
| array        | Identifier | Arrays are singly-typed                                       |
| closure      | Identifier | Closures have fixed arity                                     |
| opaque       | Identifier | For values that can manipulated only by modules (e.g. a Rune) |
| list         | see notes  | Either a Pair (passed by identifier) or empty list (null\*)   |

\* as a convention, `undefined` is passed as the JS value for void type, and `null` is passed as the JS value for empty list type,
though it is always better to check the data type to be retrieved using the `*_type` functions than to test for equality using the JS values.
Currently, an equality comparison with null is required to distinguish between a `Pair` and the empty list when accepting a parameter of the type List,
though it is hoped that an alternative can be found soon.

Note that language implementations **are expected to verify that the types of arguments to external closures are correct**,
as it is not possible for the data type to be retrieved from a raw Identifier.

### Communication interface

In order to be language and evaluator-agnostic, modules will make no assumptions about the memory model of evaluators.
Thus, evaluators are responsible for providing functions to allow modules to read, manipulate, and create data.

Each of the data types passed as identifier have functions to create an instance of that data type,
as well as read and write data to it (or call it, in the case of closures). See `conductor/types/IDataHandler`.

### Standard library

A standard library of functions must be made available to modules. See `conductor/stdlib` for sample implementations.
