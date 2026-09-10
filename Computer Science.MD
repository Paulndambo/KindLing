# Computer Science

> **Implementation note (2026-09):** The live Kindling pilot seeds this graph as **Subject → Topic (unit) → Subtopic (lesson)** via `backend/curriculum/pilot_graph.py` + `cs_provision.py`. L0 digital-literacy lessons (including **Files & folders**) are taught with **practical how-to** steps in the tutor (`frontend/src/services/learning/practicalGuides.js`), not theory-only chat. Layers below describe the full intended knowledge graph; not every L1–L14 node is provisioned yet.

I would design it as a **knowledge graph + prerequisite graph**, where a learner can enter at literally any point, but the system can recursively determine what they need to know before progressing.

The key design principle would be:

> **Never assume the learner knows something merely because their age, grade, degree, or chosen course suggests they should know it.**

A 35-year-old who has never used a computer should be able to enter the same system as a PhD student studying distributed systems, with the graph determining the appropriate path.

Below is the curriculum architecture I would propose.

---

# Kindling Computer Science Knowledge Graph

## From “What is a computer?” to PhD-level Computer Science

I would structure the graph into **15 major layers**:

```text
L0  Digital & Computer Literacy
 ↓
L1  Computational Thinking
 ↓
L2  Computer Science Foundations
 ↓
L3  Programming Foundations
 ↓
L4  Data & Algorithms
 ↓
L5  Mathematics for Computing
 ↓
L6  Computer Systems
 ↓
L7  Software Engineering
 ↓
L8  Data & Information Systems
 ↓
L9  Networks & Distributed Systems
 ↓
L10 Web, Cloud & Internet Computing
 ↓
L11 Artificial Intelligence & Data Science
 ↓
L12 Advanced Computer Science
 ↓
L13 Advanced Specializations
 ↓
L14 Research & PhD-level Computing
```

But this is **not a simple linear curriculum**.

The graph should have branches:

```text
                         COMPUTER SCIENCE
                                │
             ┌──────────────────┼──────────────────┐
             │                  │                  │
        Foundations        Programming         Mathematics
             │                  │                  │
             └────────────┬─────┴──────┬───────────┘
                          │            │
                       Systems      Algorithms
                          │            │
             ┌────────────┼────────────┼─────────────┐
             │            │            │             │
          Networks       SE         Databases       AI
             │            │            │             │
             └────────────┼────────────┼─────────────┘
                          │
                   Distributed Systems
                          │
              ┌───────────┼────────────┐
              │           │            │
             Cloud       Security     ML/AI
              │           │            │
              └───────────┼────────────┘
                          │
                 Advanced Research
                          │
              ┌───────────┼─────────────┐
              │           │             │
          Research     Specialization  Theory
              │           │             │
              └───────────┼─────────────┘
                          ▼
                         PhD
```

---

# L0 — Digital & Computer Literacy

This level is specifically designed for the **absolute beginner**.

No programming. No technical assumptions.

## L0.1 Understanding Technology

* What is technology?
* What is information?
* What is data?
* What is a digital device?
* Analog vs digital
* Digital information
* Digital representation
* Computers in everyday life
* Examples of computers
* Why computers exist
* What computers are good at
* What computers cannot inherently do

### Prerequisites

None.

---

## L0.2 What Is a Computer?

* Definition of a computer
* Input
* Processing
* Output
* Storage
* Communication
* Hardware
* Software
* Users
* Computer systems

Core mental model:

```text
Input
  ↓
Processing
  ↓
Output
  ↕
Storage
```

---

## L0.3 Types of Computers

* Desktop computers
* Laptops
* Tablets
* Smartphones
* Servers
* Mainframes
* Supercomputers
* Embedded computers
* Microcontrollers
* Game consoles
* IoT devices
* Wearables
* Automotive computers
* Industrial computers

---

## L0.4 Computer Hardware

### Physical components

* CPU
* RAM
* Storage
* Motherboard
* GPU
* Power supply
* Network interface
* Cooling
* Display
* Keyboard
* Mouse
* Touchscreen
* Speakers
* Microphone
* Camera

### Understand

* What each component does
* How components interact
* Temporary vs persistent storage
* Processing vs storage
* CPU vs GPU

---

## L0.5 Computer Software

* Operating systems
* Applications
* Drivers
* Utilities
* Firmware
* System software
* Application software
* Files
* Processes
* Programs

---

## L0.6 Files & Folders

* Files
* File names
* File extensions
* Directories
* Paths
* File types
* File permissions
* Copying
* Moving
* Renaming
* Deleting
* Compression
* Archives
* Backups

---

## L0.7 Operating a Computer

* Desktop environments
* Windows/Linux/macOS concepts
* Applications
* Windows
* Menus
* Settings
* Installing software
* Updating software
* Uninstalling software
* Basic troubleshooting

---

## L0.8 Internet Literacy

* Internet
* Web
* Browser
* Search engine
* Website
* URL
* Domain
* Web page
* Hyperlink
* Download
* Upload
* Cloud services
* Email
* Messaging

---

## L0.9 Digital Safety

* Passwords
* MFA
* Phishing
* Malware
* Scams
* Privacy
* Personal data
* Digital identity
* Safe browsing
* Social engineering
* Backups

---

# L1 — Computational Thinking

This is the bridge from **using computers** to **thinking like a computer scientist**.

## L1.1 Problem Solving

* What is a problem?
* Problem decomposition
* Identifying constraints
* Inputs
* Outputs
* Desired state
* Breaking large problems into smaller problems

---

## L1.2 Algorithms

* What is an algorithm?
* Step-by-step instructions
* Algorithms in everyday life
* Precision
* Determinism
* Termination
* Correctness

Example:

```text
Make tea
 ↓
Boil water
 ↓
Prepare cup
 ↓
Add tea
 ↓
Add hot water
 ↓
Steep
 ↓
Serve
```

---

## L1.3 Abstraction

* What is abstraction?
* Ignoring irrelevant detail
* Models
* Interfaces
* Layers
* Encapsulation
* Generalization

---

## L1.4 Pattern Recognition

* Identifying patterns
* Repetition
* Sequences
* Similarity
* Generalization

---

## L1.5 Logical Thinking

* Statements
* Conditions
* AND
* OR
* NOT
* Truth
* Logical implication
* Contradiction
* Equivalence

---

## L1.6 Computational Representation

* Symbols
* Numbers
* Text
* Images
* Sound
* Instructions
* State

---

# L2 — Computer Science Foundations

Now the learner begins studying the actual science of computing.

## L2.1 History of Computing

* Counting systems
* Abacus
* Mechanical calculators
* Analytical Engine
* Early computers
* Turing
* Von Neumann
* Transistors
* Integrated circuits
* Personal computers
* Internet
* Mobile computing
* Cloud computing
* AI era

---

# L2.2 Number Systems

* Decimal
* Binary
* Octal
* Hexadecimal
* Base conversion
* Binary arithmetic
* Signed numbers
* Two's complement

---

# L2.3 Data Representation

* Bits
* Bytes
* Words
* Integers
* Floating point
* Characters
* ASCII
* Unicode
* Strings
* Boolean values
* Images
* Audio
* Video

---

# L2.4 Boolean Algebra

* Boolean variables
* AND
* OR
* NOT
* XOR
* NAND
* NOR
* Truth tables
* Boolean expressions
* Boolean simplification

---

# L2.5 Digital Logic

* Logic gates
* Combinational circuits
* Adders
* Multiplexers
* Decoders
* Comparators
* Sequential circuits
* Flip-flops
* Registers
* Counters

This leads into:

```text
Logic Gates
    ↓
Digital Circuits
    ↓
CPU Components
```

---

# L2.6 How a Computer Actually Works

* Machine instructions
* CPU
* Registers
* ALU
* Control unit
* Program counter
* Instruction cycle
* Fetch
* Decode
* Execute
* Memory access
* Interrupts

Core cycle:

```text
Fetch
 ↓
Decode
 ↓
Execute
 ↓
Memory
 ↓
Write back
 ↓
Repeat
```

---

# L3 — Programming Foundations

This is where learners start creating software.

I would use **Python as the primary beginner language**, while teaching language-independent concepts.

## L3.1 Programming Concepts

* What is a program?
* Source code
* Compiler
* Interpreter
* Runtime
* Syntax
* Semantics
* Errors
* Debugging

---

## L3.2 Variables

* Variables
* Values
* Assignment
* Naming
* Types
* Constants
* Scope

---

## L3.3 Primitive Types

* Integers
* Floating point
* Boolean
* Strings
* Characters
* None/null concepts

---

## L3.4 Operators

* Arithmetic
* Comparison
* Logical
* Assignment
* Bitwise
* Membership
* Identity

---

## L3.5 Control Flow

* Sequential execution
* Conditions
* if
* elif
* else
* loops
* while
* for
* break
* continue

---

## L3.6 Functions

* Function definition
* Parameters
* Arguments
* Return values
* Local variables
* Scope
* Pure functions
* Side effects
* Recursion

---

## L3.7 Data Structures

* Arrays/lists
* Tuples
* Sets
* Dictionaries/maps
* Strings
* Stacks
* Queues

---

## L3.8 Errors & Debugging

* Syntax errors
* Runtime errors
* Logic errors
* Exceptions
* Stack traces
* Debuggers
* Logging
* Assertions
* Defensive programming

---

## L3.9 Files

* Reading files
* Writing files
* CSV
* JSON
* Serialization
* Deserialization

---

## L3.10 Modules

* Modules
* Packages
* Imports
* Dependencies
* Package managers
* Virtual environments

---

# L4 — Algorithms & Data Structures

This becomes one of the **central hubs of the entire graph**.

## L4.1 Algorithm Analysis

* Correctness
* Efficiency
* Time complexity
* Space complexity
* Big O
* Big Ω
* Big Θ
* Best case
* Worst case
* Average case
* Amortized analysis

---

## L4.2 Searching

* Linear search
* Binary search
* Hash-based lookup
* Search trees

---

## L4.3 Sorting

* Bubble sort
* Selection sort
* Insertion sort
* Merge sort
* Quick sort
* Heap sort
* Counting sort
* Radix sort

---

## L4.4 Fundamental Data Structures

* Arrays
* Linked lists
* Stacks
* Queues
* Deques
* Hash tables
* Trees
* Heaps
* Graphs

---

## L4.5 Trees

* Binary trees
* Binary search trees
* AVL trees
* Red-black trees
* B-trees
* Tries
* Segment trees
* Fenwick trees

---

## L4.6 Graphs

* Directed graphs
* Undirected graphs
* Weighted graphs
* Adjacency matrices
* Adjacency lists
* BFS
* DFS
* Shortest path
* Dijkstra
* Bellman-Ford
* Floyd-Warshall
* Minimum spanning trees
* Prim
* Kruskal
* Topological sorting

---

## L4.7 Algorithmic Paradigms

* Brute force
* Divide and conquer
* Greedy algorithms
* Dynamic programming
* Backtracking
* Branch and bound
* Randomized algorithms

---

## L4.8 Advanced Algorithms

* String algorithms
* Computational geometry
* Network flow
* Matching
* Approximation algorithms
* Online algorithms
* Streaming algorithms
* External-memory algorithms
* Parallel algorithms

---

# L5 — Mathematics for Computer Science

This shouldn't be treated as a separate degree-like subject.

It should be connected to the concepts that require it.

## L5.1 Mathematics Foundations

* Arithmetic
* Fractions
* Ratios
* Percentages
* Algebra
* Equations
* Functions
* Graphs

---

## L5.2 Discrete Mathematics

### Logic

* Propositions
* Predicates
* Quantifiers
* Proofs
* Inference

### Sets

* Sets
* Subsets
* Union
* Intersection
* Difference
* Cartesian products

### Relations

* Relations
* Equivalence relations
* Partial orders

### Functions

* Injective
* Surjective
* Bijective

---

## L5.3 Proof Techniques

* Direct proof
* Contradiction
* Contrapositive
* Mathematical induction
* Strong induction
* Structural induction

---

## L5.4 Combinatorics

* Counting
* Permutations
* Combinations
* Pigeonhole principle
* Recurrences
* Generating functions

---

## L5.5 Probability

* Probability
* Conditional probability
* Bayes' theorem
* Random variables
* Expected value
* Variance
* Distributions

---

## L5.6 Statistics

* Descriptive statistics
* Sampling
* Estimation
* Hypothesis testing
* Regression
* Correlation

---

## L5.7 Linear Algebra

* Vectors
* Matrices
* Linear transformations
* Eigenvalues
* Eigenvectors
* Matrix decomposition
* Vector spaces

---

## L5.8 Calculus

* Limits
* Derivatives
* Integrals
* Multivariable calculus
* Gradients
* Optimization

---

# L6 — Computer Architecture & Systems

## L6.1 Computer Architecture

* CPU architecture
* Instruction sets
* Registers
* Pipelines
* Caches
* Memory hierarchy
* Branch prediction
* SIMD
* Multicore systems
* GPU architecture

---

## L6.2 Assembly

* Assembly language
* Registers
* Instructions
* Addressing modes
* Stack
* Calling conventions
* Assembly debugging

---

## L6.3 Operating Systems

* Processes
* Threads
* Scheduling
* Memory management
* Virtual memory
* File systems
* System calls
* Interrupts
* Synchronization
* Deadlocks
* Permissions

---

## L6.4 Concurrency

* Race conditions
* Mutexes
* Semaphores
* Monitors
* Atomic operations
* Lock-free programming
* Thread pools
* Actor models

---

## L6.5 Storage Systems

* HDD
* SSD
* Filesystems
* RAID
* Journaling
* Distributed storage

---

## L6.6 Compilers

* Lexing
* Parsing
* Abstract syntax trees
* Semantic analysis
* Intermediate representation
* Optimization
* Code generation
* Runtime systems
* Garbage collection

---

# L7 — Software Engineering

## L7.1 Software Development

* Requirements
* Design
* Implementation
* Testing
* Deployment
* Maintenance

---

## L7.2 Version Control

* Git
* Commits
* Branches
* Merging
* Rebasing
* Pull requests
* Code review

---

## L7.3 Testing

* Unit testing
* Integration testing
* End-to-end testing
* Regression testing
* Property-based testing
* Fuzz testing
* Mutation testing

---

## L7.4 Software Design

* Modularity
* Cohesion
* Coupling
* Encapsulation
* SOLID
* Design patterns
* Architectural patterns

---

## L7.5 Architecture

* Monoliths
* Modular monoliths
* Microservices
* Event-driven systems
* Serverless
* Layered architecture
* Hexagonal architecture
* Clean architecture

---

## L7.6 DevOps

* CI/CD
* Containers
* Docker
* Infrastructure as Code
* Configuration management
* Observability
* Monitoring
* Logging
* Tracing

---

# L8 — Databases & Information Systems

## L8.1 Database Foundations

* Data models
* Relational databases
* Tables
* Rows
* Columns
* Primary keys
* Foreign keys
* Constraints

---

## L8.2 SQL

* SELECT
* INSERT
* UPDATE
* DELETE
* JOIN
* GROUP BY
* HAVING
* Subqueries
* CTEs
* Window functions

---

## L8.3 Database Design

* ER modelling
* Normalization
* Denormalization
* Indexing
* Query optimization

---

## L8.4 Transactions

* ACID
* Isolation
* Atomicity
* Consistency
* Durability
* Locks
* MVCC
* Deadlocks

---

## L8.5 NoSQL

* Document databases
* Key-value stores
* Column stores
* Graph databases
* CAP theorem

---

## L8.6 Distributed Databases

* Replication
* Sharding
* Consensus
* Distributed transactions
* Eventual consistency
* Conflict resolution

---

# L9 — Computer Networks

## L9.1 Networking Foundations

* Network
* LAN
* WAN
* Internet
* Packets
* Bandwidth
* Latency
* Throughput

---

## L9.2 Protocols

* Ethernet
* ARP
* IP
* ICMP
* TCP
* UDP
* DNS
* DHCP
* HTTP
* HTTPS
* TLS

---

## L9.3 Network Architecture

* OSI model
* TCP/IP model
* Routing
* Switching
* NAT
* Firewalls
* Proxies

---

## L9.4 Advanced Networking

* BGP
* IPv6
* Multicast
* QoS
* SDN
* Network virtualization
* Overlay networks

---

# L10 — Distributed Systems

This deserves its own major branch.

## Foundations

* Distributed processes
* Communication
* Clocks
* Partial failure
* Network partitions
* Replication

## Distributed Coordination

* Leader election
* Consensus
* Raft
* Paxos
* Quorums

## Distributed Data

* Replication
* Partitioning
* Consistency
* Eventual consistency
* Strong consistency
* CRDTs

## Distributed Computing

* MapReduce
* Stream processing
* Message queues
* Pub/sub
* Event sourcing

## Advanced

* Byzantine faults
* Byzantine consensus
* Distributed transactions
* Global-scale systems
* Fault tolerance
* Self-healing systems
* Adaptive systems

---

# L11 — Web, Cloud & Internet Computing

## Web

* HTML
* CSS
* JavaScript
* DOM
* Browser architecture
* HTTP
* APIs
* REST
* GraphQL
* WebSockets

## Backend

* Servers
* Authentication
* Authorization
* Sessions
* Caching
* Queues
* Background jobs

## Cloud

* Virtual machines
* Containers
* Kubernetes
* Serverless
* Object storage
* Load balancing
* Autoscaling

## Cloud Architecture

* High availability
* Fault tolerance
* Disaster recovery
* Multi-region systems
* Infrastructure automation
* Cost optimization

---

# L12 — Cybersecurity

## Foundations

* CIA triad
* Threats
* Vulnerabilities
* Risk
* Authentication
* Authorization

## Cryptography

* Symmetric encryption
* Asymmetric encryption
* Hashing
* Digital signatures
* PKI
* Key exchange

## Application Security

* SQL injection
* XSS
* CSRF
* SSRF
* Authentication vulnerabilities
* Authorization vulnerabilities

## Systems Security

* Operating system security
* Network security
* Malware
* Sandboxing
* Secure boot

## Advanced Security

* Zero trust
* Security engineering
* Privacy
* Formal security
* Applied cryptography
* Secure distributed systems

---

# L13 — Artificial Intelligence

This should be a major branch, not merely “learn ChatGPT.”

## Foundations

* AI history
* Intelligent agents
* Search
* Knowledge representation
* Reasoning
* Planning

## Classical AI

* BFS/DFS
* A*
* Minimax
* Constraint satisfaction
* Expert systems
* Logic programming

## Machine Learning

* Supervised learning
* Unsupervised learning
* Reinforcement learning
* Regression
* Classification
* Clustering
* Feature engineering
* Model evaluation

## Deep Learning

* Neural networks
* Backpropagation
* CNNs
* RNNs
* Transformers
* Attention

## Modern AI

* LLMs
* Embeddings
* Vector databases
* RAG
* Fine-tuning
* Agents
* Tool use
* Multimodal AI
* Evaluation

## Advanced AI

* Reinforcement learning
* RLHF
* Alignment
* AI safety
* Interpretability
* AI reasoning
* AI planning
* Neuro-symbolic systems
* Multi-agent systems

---

# L14 — Human-Computer Interaction

## Foundations

* Human cognition
* Usability
* Accessibility
* Interaction design
* User research

## Interface Design

* GUI
* Mobile UI
* Web UI
* Voice interfaces
* Conversational interfaces

## Advanced

* Human-AI interaction
* Explainable AI
* Adaptive interfaces
* Affective computing
* Cognitive systems
* Educational technology

This branch becomes particularly relevant to **Kindling itself**.

---

# L15 — Theory of Computation

This is where the curriculum becomes deeply theoretical.

## Formal Languages

* Alphabets
* Strings
* Languages
* Grammars

## Automata

* Finite automata
* DFA
* NFA
* Regular languages

## Context-Free Languages

* CFGs
* Pushdown automata
* Parsing

## Computability

* Turing machines
* Decidability
* Recognizability
* Halting problem
* Reducibility

## Complexity Theory

* P
* NP
* NP-complete
* NP-hard
* PSPACE
* EXPTIME
* Complexity classes
* Reductions

---

# L16 — Programming Languages

## Language Theory

* Syntax
* Semantics
* Type systems
* Operational semantics
* Denotational semantics

## Paradigms

* Procedural
* Object-oriented
* Functional
* Logic programming
* Declarative
* Concurrent programming

## Type Systems

* Static typing
* Dynamic typing
* Type inference
* Polymorphism
* Generics
* Dependent types
* Linear types

## Language Implementation

* Compilers
* Interpreters
* Virtual machines
* JIT compilation
* Garbage collection

---

# L17 — Advanced Algorithms & Theory

* Randomized algorithms
* Approximation algorithms
* Online algorithms
* Distributed algorithms
* Parallel algorithms
* Quantum algorithms
* Cryptographic algorithms
* Computational geometry
* Streaming algorithms
* Sublinear algorithms

---

# L18 — Computer Graphics & Vision

## Graphics

* Coordinate systems
* Rendering
* Rasterization
* Transformations
* Lighting
* Shading
* Ray tracing

## Computer Vision

* Image processing
* Feature extraction
* Object detection
* Segmentation
* Recognition
* 3D vision

## Advanced

* Neural rendering
* Generative vision
* 3D reconstruction
* Computer graphics + AI

---

# L19 — Robotics & Autonomous Systems

* Sensors
* Actuators
* Control
* Kinematics
* Localization
* Mapping
* Path planning
* Robot perception
* Autonomous decision-making
* Multi-robot systems

---

# L20 — Scientific Computing

* Numerical methods
* Numerical linear algebra
* Numerical optimization
* Simulation
* Monte Carlo methods
* High-performance computing
* Parallel computing
* Scientific visualization

---

# L21 — Quantum Computing

* Qubits
* Superposition
* Entanglement
* Quantum gates
* Quantum circuits
* Measurement
* Quantum algorithms
* Grover's algorithm
* Shor's algorithm
* Quantum complexity
* Quantum cryptography

---

# L22 — Advanced Systems Research

This is where several modern research areas converge.

## Cloud Computing

* Resource scheduling
* Elasticity
* Multi-tenancy
* Serverless systems
* Edge computing

## Distributed Systems

* Consensus
* Replication
* Fault tolerance
* Distributed transactions

## Autonomic Computing

* Self-configuration
* Self-healing
* Self-optimization
* Self-protection

## Adaptive Systems

* Feedback loops
* Runtime adaptation
* Control theory
* MAPE-K
* Adaptive architectures
* Self-adaptive software

This particular branch is highly relevant to the kind of research you've been working on.

---

# L23 — Formal Methods

## Foundations

* Formal specification
* Mathematical modelling
* Logic

## Verification

* Model checking
* Theorem proving
* Static analysis
* Program verification

## Advanced

* Temporal logic
* Hoare logic
* Separation logic
* Refinement
* Formal verification of distributed systems
* Formal verification of concurrent systems

---

# L24 — Computing Ethics, Society & Policy

This should not be an optional afterthought.

* Computer ethics
* Privacy
* Digital rights
* Algorithmic bias
* AI ethics
* AI safety
* Intellectual property
* Technology regulation
* Cyber law
* Data governance
* Responsible AI
* Socio-technical systems
* Digital inequality

---

# L25 — Research Methodology

This is the bridge to Master's and PhD-level work.

## Research Foundations

* What constitutes research?
* Research questions
* Hypotheses
* Literature reviews
* Systematic literature reviews
* Research gaps
* Conceptual frameworks

## Research Design

* Experimental research
* Case studies
* Surveys
* Qualitative research
* Quantitative research
* Mixed methods
* Design science
* Action research

## Scientific Evaluation

* Variables
* Controls
* Baselines
* Metrics
* Reproducibility
* Validity
* Reliability
* Statistical significance
* Effect sizes

---

# L26 — Advanced Research

At this stage Kindling shouldn't simply teach "advanced topics."

It should teach the learner to **produce knowledge**.

## Research Skills

* Reading research papers
* Finding research gaps
* Formulating research questions
* Designing experiments
* Designing benchmarks
* Building prototypes
* Running experiments
* Statistical analysis
* Reproducibility
* Writing papers
* Peer review
* Research presentations

---

# L27 — PhD-Level Specialization

This should become a **research tree rather than one curriculum**.

For example:

```text
                    PhD Computer Science
                           │
       ┌───────────────────┼───────────────────┐
       │                   │                   │
   AI/ML Research     Systems Research    Theory Research
       │                   │                   │
   ┌───┼────┐          ┌───┼────┐          ┌───┼────┐
   │   │    │          │   │    │          │   │    │
  NLP CV   RL         DS  Cloud SE        Algo PL  Complexity
```

---

# PhD Research Branches

## Artificial Intelligence

* Machine learning theory
* Deep learning
* Reinforcement learning
* Generative AI
* LLMs
* AI agents
* AI safety
* Explainability
* Multimodal systems
* Continual learning
* Federated learning
* Neuro-symbolic AI

---

## Computer Systems

* Operating systems research
* Distributed systems
* Cloud computing
* Edge computing
* Serverless computing
* Storage systems
* Database systems
* Computer architecture

---

## Software Engineering

* Software architecture
* Program analysis
* Automated software engineering
* Software evolution
* Technical debt
* Self-adaptive software
* AI-assisted software engineering

---

## Human-Computer Interaction

* Human-AI collaboration
* Educational technology
* Accessibility
* Cognitive interaction
* Conversational systems
* Adaptive interfaces

---

## Security

* Applied cryptography
* Network security
* Systems security
* Privacy-preserving computing
* Blockchain security
* AI security

---

## Theory

* Computational complexity
* Algorithms
* Distributed algorithms
* Formal methods
* Programming languages
* Type theory
* Computability

---

# The Critical Part: Prerequisite Relationships

This is where I think Kindling could become genuinely differentiated.

The curriculum shouldn't merely be:

```text
Course → Module → Lesson
```

It should be:

```text
CONCEPT
   │
   ├── requires
   │
   ▼
PREREQUISITE
   │
   ├── enables
   │
   ▼
ADVANCED CONCEPT
```

For example:

```text
Variables
   ↓
Functions
   ↓
Recursion
   ↓
Recursive Algorithms
   ↓
Tree Algorithms
   ↓
Graph Algorithms
   ↓
Advanced Algorithms
```

Another:

```text
Binary
   ↓
Boolean Logic
   ↓
Logic Gates
   ↓
Digital Circuits
   ↓
CPU Architecture
   ↓
Assembly
   ↓
Operating Systems
   ↓
Concurrency
```

Another:

```text
Probability
   ↓
Statistics
   ↓
Machine Learning
   ↓
Neural Networks
   ↓
Deep Learning
   ↓
Transformers
   ↓
LLMs
```

Another:

```text
Networks
   ↓
TCP/IP
   ↓
Distributed Communication
   ↓
Distributed Systems
   ↓
Consensus
   ↓
Fault Tolerance
   ↓
Advanced Distributed Systems Research
```

---

# The Learner Should Be Able to Enter Anywhere

This is crucial.

Imagine someone says:

> "I want to learn Kubernetes."

Kindling shouldn't necessarily start Kubernetes from lesson 1.

It should construct:

```text
Kubernetes
│
├── Containers
│    └── Docker
│
├── Linux
│
├── Networking
│    ├── TCP/IP
│    ├── DNS
│    └── HTTP
│
├── Distributed Systems
│
└── Infrastructure
```

Then determine:

```text
Docker        ✓
Linux         ✓
Networking    72%
Distributed   41%
```

And generate a personalized prerequisite path:

```text
Networking fundamentals
        ↓
TCP/IP
        ↓
Container networking
        ↓
Distributed systems basics
        ↓
Kubernetes architecture
        ↓
Pods
        ↓
Services
        ↓
Deployments
        ↓
Controllers
        ↓
Operators
```

That's **far more powerful than a conventional course catalogue.**

---

# The Graph Should Also Contain Difficulty

Each concept should have metadata such as:

```text
Concept:
    Recursion

Domain:
    Algorithms

Prerequisites:
    Functions
    Stack
    Control Flow

Difficulty:
    Intermediate

Cognitive Level:
    Apply / Analyze

Related Concepts:
    Trees
    DFS
    Dynamic Programming

Common Misconceptions:
    "Recursion always causes infinite loops"

Assessment Types:
    MCQ
    Code
    Explanation
    Debugging
    Design

Evidence Required:
    Can explain
    Can implement
    Can debug
    Can transfer
```

That becomes enormously useful for the adaptive engine.

---

# I Would Actually Make the Graph Multi-Dimensional

Not every relationship should be:

> A → B

You want different edge types:

```text
REQUIRES
ENABLES
RELATED_TO
PART_OF
ALTERNATIVE_TO
APPLIED_IN
BUILDS_ON
COMMON_MISCONCEPTION_OF
ASSESSED_BY
IMPLEMENTED_BY
GENERALIZES
SPECIALIZES
```

For example:

```text
TCP/IP
   │
   ├── REQUIRES → Binary
   ├── REQUIRES → Networking Basics
   ├── ENABLES → HTTP
   ├── ENABLES → Distributed Systems
   ├── APPLIED_IN → Kubernetes
   └── APPLIED_IN → Cloud Computing
```

Now you've got an actual **knowledge graph**, not merely a syllabus.

---

# And I would add a “Mastery Graph”

This is perhaps the most important part for Kindling.

The curriculum graph represents:

> **What exists to be learned.**

The learner graph represents:

> **What this particular learner currently knows.**

For example:

```text
              KNOWLEDGE GRAPH
                     │
                     ▼
             ┌──────────────┐
             │   Algebra    │
             └──────┬───────┘
                    │
          ┌─────────┼─────────┐
          ▼         ▼         ▼
       Variables Functions Equations
          │         │         │
          │         │         │
          ▼         ▼         ▼
       0.92       0.76       0.41
      mastery    mastery    mastery
```

Kindling therefore doesn't ask:

> "What lesson comes next?"

It asks:

> **"Given this learner's current state, what intervention has the highest expected learning value?"**

That is a completely different system.

---

# Finally: I would give Kindling 5 learner modes

The graph should support different learning goals.

### Explorer

> “I want to understand computers.”

### Student

> “I need to pass my university course.”

### Builder

> “I want to build software.”

### Professional

> “I want to become a senior engineer.”

### Researcher

> “I want to contribute new knowledge.”

The underlying knowledge graph remains the same.

What changes is the **path through the graph**.

For example:

```text
                    COMPUTER SCIENCE
                           │
                  ┌────────┴────────┐
                  │                 │
               KNOWLEDGE          GOAL
                  │                 │
                  └────────┬────────┘
                           ▼
                    Learner Model
                           │
                           ▼
                    Optimal Path
```

A 12-year-old curious about computers, a university CS student, a backend engineer, and a PhD researcher can therefore all use the **same intelligence platform** while receiving completely different learning trajectories.

---

# The ultimate Kindling graph

If I were designing the actual product architecture, I would aim for something like this:

```text
                         ┌─────────────────────┐
                         │ COMPUTER SCIENCE    │
                         │ KNOWLEDGE GRAPH     │
                         └──────────┬──────────┘
                                    │
          ┌─────────────────────────┼────────────────────────┐
          │                         │                        │
     Concepts                   Skills                   Problems
          │                         │                        │
          └─────────────────────────┼────────────────────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │ CURRICULUM ENGINE   │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │    LEARNER MODEL    │
                         │                     │
                         │ Knowledge           │
                         │ Misconceptions      │
                         │ Confidence          │
                         │ Behaviour           │
                         │ Retention           │
                         │ Assistance          │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │ PEDAGOGICAL ENGINE  │
                         └──────────┬──────────┘
                                    │
                 ┌──────────────────┼──────────────────┐
                 ▼                  ▼                  ▼
              TEACH               ASSESS             REVIEW
                 │                  │                  │
                 └──────────────────┼──────────────────┘
                                    ▼
                                  LLM
                                    │
                                    ▼
                               INTERACTION
                                    │
                                    ▼
                               NEW EVIDENCE
                                    │
                                    └───────────────┐
                                                    │
                                                    ▼
                                             LEARNER MODEL
```

**That is what I would build around.**

And importantly, the graph should not stop at “PhD-level content.” At the top of the graph, the learner transitions from **learning established knowledge** to **producing new knowledge**.

That's the fundamental distinction between a good educational product and a serious learning-intelligence platform.

The ultimate trajectory becomes:

**Use a computer → understand computers → program computers → design software → understand computation → engineer complex systems → conduct computer science research → contribute new knowledge.**

That gives Kindling a plausible **single continuous learning universe from a child touching a computer for the first time all the way to a researcher working on novel distributed systems, AI, formal methods, or quantum computing.**

And I would strongly recommend that the team **not implement this as one giant static syllabus**. The next engineering artifact should be a machine-readable **CS Knowledge Graph schema**—with concepts, prerequisite edges, skills, misconceptions, assessments, difficulty, learning objectives, and mastery criteria. That is what could eventually drive the adaptive tutor itself.