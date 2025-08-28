# Building a Type-Safe Redis Client in OCaml

_Published: August 27, 2025_

I'm building a Redis client native to OCaml to explore the language's powerful type system. This project taught me how types can enforce protocol correctness at compile time, eliminating entire categories of runtime errors.

## Parse, Don't Validate

The core principle driving this project comes from Alexis King's article "Parse, Don't Validate". Instead of checking if data is valid and passing it along unchanged, we parse it into a type that makes invalid states unrepresentable.

In our Redis client, every RESP3 protocol message becomes a specific variant of our `resp_value` type. Once parsed, we know the data is valid - the type system guarantees it.

This approach leverages OCaml's algebraic data types, which let us model exactly what's possible in our domain. Unlike stringly-typed interfaces where everything is a string until proven otherwise, our parsed values carry their semantic meaning in their types.

## The RESP3 Protocol

Redis uses RESP3 (REdis Serialization Protocol v3) for client-server communication. Each message type has a unique prefix character that determines how to parse the rest.

```ocaml
type resp_value =
  | SimpleString of string          (* +OK\r\n *)
  | SimpleError of string           (* -ERR message\r\n *)
  | Integer of int64                (* :42\r\n *)
  | BulkString of string option     (* $6\r\nfoobar\r\n *)
  | Array of resp_value list option (* *2\r\n... *)
  | Null                            (* _\r\n *)
  | Boolean of bool                 (* #t\r\n or #f\r\n *)
  | Double of float                 (* ,3.14\r\n *)
  | BigNumber of Z.t                (* (3492890328409238509324850943850943850\r\n *)
  (* ... and more RESP3 types *)
```

Each variant captures exactly what that message type can contain. A `BulkString` might be null (None), but a `SimpleString` never can be.

This sum type (called a tagged union in other languages) means the compiler knows all possible shapes our data can take. When we pattern match on a `resp_value`, the compiler ensures we handle every case - forgetting one is a compile-time error, not a runtime surprise.

## Parser Combinators with Angstrom

I used Angstrom, a parser combinator library, to build the parser. Parser combinators let you compose small parsers into larger ones, mirroring the compositional nature of functional programming itself.

The main parser peeks at the first character to determine the message type:

```ocaml
let parse_resp =
  fix (fun self ->
    peek_char >>= function
    | Some '+' -> (char '+' *> till_crlf >>| fun s -> SimpleString s)
    | Some '$' -> (char '$' *> parse_bulk_string_body)
    | Some '*' -> (char '*' *> parse_array_body self)
    (* ... other cases ... *)
  )
```

The `fix` combinator enables recursion - crucial for nested structures like arrays containing other arrays. Each specific parser handles its type's format precisely.

Notice how we use monadic bind (`>>=`) to sequence parsing operations and map (`>>|`) to transform results. These operators come from OCaml's strong foundation in category theory. The parser is essentially a state monad that threads the input stream through each parsing step.

## The Buffered Parser

Network data arrives in chunks, not complete messages. A message might span multiple network packets, or one packet might contain multiple messages.

The buffered parser handles this elegantly using a state machine:

```ocaml
let parse_resp_buffered (reader : unit -> string Lwt.t) =
  let rec parse_with_state state =
    match state with
    | Buffered.Done (_, value) ->
        Lwt.return_ok value
    | Buffered.Partial continue ->
        let* chunk = reader () in
        if String.length chunk = 0 then
          (* Handle EOF *)
        else
          parse_with_state (continue (`String chunk))
    | Buffered.Fail (_, _, msg) ->
        Lwt.return_error msg
```

The parser tracks three states. `Done` means we have a complete value. `Partial` means we need more data. `Fail` indicates a protocol error.

When the parser needs more data, we read another chunk from the network and feed it in. The parser maintains all internal state between chunks, avoiding the manual buffer management that plagues imperative implementations.

This design showcases functional programming's strength in state machines. Each state is explicit, transitions are pure functions, and the recursive structure naturally matches the problem domain. The Lwt promises provide cooperative concurrency, letting thousands of connections parse simultaneously without thread overhead.

## Serialization with Mutual Recursion

Serializing RESP values back to protocol format requires mutual recursion. An array might contain maps, which contain other arrays, and so on.

```ocaml
let rec serialize_resp3 = function
  | Array (Some items) -> serialize_array items
  | Map pairs -> serialize_map pairs
  (* ... *)

and serialize_array items =
  "*" ^ string_of_int (List.length items) ^ "\r\n" ^
  String.concat "" (List.map serialize_resp3 items)

and serialize_map pairs =
  "%" ^ string_of_int (List.length pairs) ^ "\r\n" ^
  (* ... *)
```

The `and` keyword defines mutually recursive functions that can call each other. This mirrors the mutually recursive nature of the protocol itself.

OCaml's tail-call optimization ensures these recursive calls won't blow the stack, even for deeply nested structures. The compiler transforms tail-recursive calls into loops, giving us the elegance of recursion with the efficiency of iteration.

## Type Safety Benefits

This approach catches protocol errors at compile time. You can't accidentally treat an error message as a string value - they have different types.

The optional types (`string option`, `list option`) make null handling explicit. You must handle the null case or the code won't compile.

Pattern matching ensures we handle every message type. Adding a new RESP3 type forces us to update all code that processes messages. The compiler becomes your assistant, guiding you to every place that needs updating.

## Real-World Impact

This type-driven approach scales beautifully. As the codebase grows, types document intent better than comments. Refactoring becomes fearless - change a type definition and the compiler shows you exactly what needs updating.

The performance is excellent too. OCaml compiles to native code, and the zero-cost abstractions mean our high-level types compile down to efficient machine code. The buffered parser handles gigabits of Redis traffic without breaking a sweat.

## Conclusion

Building this Redis client demonstrated OCaml's strength in protocol implementation. The type system acts as a correctness proof that grows with your code.

By parsing instead of validating, we transform unstructured network bytes into well-typed values. Invalid states become impossible to represent, preventing entire classes of bugs.

The functional approach - immutable data, explicit effects, and strong types - makes the code both correct and maintainable. Each function is a puzzle piece that fits exactly where it should, guided by types that ensure the whole system works together.

The complete code is available on [my GitHub](https://github.com/leeswindell).

---

_Technologies used: OCaml, Angstrom, Lwt, RESP3 Protocol_
