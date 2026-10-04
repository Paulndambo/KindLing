"""
Pilot skill graph: Computer Science knowledge graph (L0 → L5 pilot).

Source architecture: repo root ``Computer Science.MD``.
Principle: never assume prior knowledge from age/grade — entry can be L0.

Pilot scope: layers L0–L5 with every Lx.y section as its own lesson (subtopic),
and every bullet concept from the source doc captured in learning goals + skill
descriptions so the tutor and learner can cover full depth.

Seeded into Skill / SkillPrerequisite / TopicSkillLink and attached to the
demo student's Computer Science subject.
"""

from __future__ import annotations

from typing import Any, Dict, List, Tuple

# (slug, name, short_label, domain, description, standard_codes, sort, p_init, transit, slip, guess)
SKILLS: List[Tuple] = [
    (
        "cs.l0.tech_basics",
        "Understanding technology",
        "Tech basics",
        "cs_literacy",
        "What is technology?; What is information?; What is data?; What is a digital device?; Analog vs digital; Digital information; Digital representation; Computers in everyday life; Examples of computers; Why computers exist; +2 more",
        ['CS.L0.1'],
        10,
        0.35,
        0.16,
        0.08,
        0.22,
    ),
    (
        "cs.l0.what_is_computer",
        "What is a computer?",
        "Computer model",
        "cs_literacy",
        "Definition of a computer; Input; Processing; Output; Storage; Communication; Hardware; Software; Users; Computer systems",
        ['CS.L0.2'],
        20,
        0.3,
        0.15,
        0.08,
        0.2,
    ),
    (
        "cs.l0.computer_types",
        "Types of computers",
        "Device types",
        "cs_literacy",
        "Desktop computers; Laptops; Tablets; Smartphones; Servers; Mainframes; Supercomputers; Embedded computers; Microcontrollers; Game consoles; +4 more",
        ['CS.L0.3'],
        30,
        0.28,
        0.14,
        0.08,
        0.2,
    ),
    (
        "cs.l0.hardware",
        "Computer hardware",
        "Hardware",
        "cs_literacy",
        "CPU; RAM; Storage; Motherboard; GPU; Power supply; Network interface; Cooling; Display; Keyboard; +10 more",
        ['CS.L0.4'],
        40,
        0.22,
        0.13,
        0.09,
        0.18,
    ),
    (
        "cs.l0.software",
        "Computer software",
        "Software",
        "cs_literacy",
        "Operating systems; Applications; Drivers; Utilities; Firmware; System software; Application software; Files; Processes; Programs",
        ['CS.L0.5'],
        50,
        0.22,
        0.13,
        0.09,
        0.18,
    ),
    (
        "cs.l0.files_folders",
        "Files & folders",
        "Files",
        "cs_literacy",
        "Files; File names; File extensions; Directories; Paths; File types; File permissions; Copying; Moving; Renaming; +4 more",
        ['CS.L0.6'],
        60,
        0.28,
        0.14,
        0.08,
        0.2,
    ),
    (
        "cs.l0.operate_computer",
        "Operating a computer",
        "Using a PC",
        "cs_literacy",
        "Desktop environments; Windows/Linux/macOS concepts; Applications; Windows; Menus; Settings; Installing software; Updating software; Uninstalling software; Basic troubleshooting",
        ['CS.L0.7'],
        70,
        0.28,
        0.14,
        0.08,
        0.2,
    ),
    (
        "cs.l0.internet_literacy",
        "Internet literacy",
        "Internet",
        "cs_literacy",
        "Internet; Web; Browser; Search engine; Website; URL; Domain; Web page; Hyperlink; Download; +4 more",
        ['CS.L0.8'],
        80,
        0.28,
        0.14,
        0.08,
        0.2,
    ),
    (
        "cs.l0.digital_safety",
        "Digital safety",
        "Safety",
        "cs_literacy",
        "Passwords; MFA; Phishing; Malware; Scams; Privacy; Personal data; Digital identity; Safe browsing; Social engineering; +1 more",
        ['CS.L0.9'],
        90,
        0.24,
        0.13,
        0.08,
        0.18,
    ),
    (
        "cs.l1.problem_solving",
        "Problem solving",
        "Solve problems",
        "comp_thinking",
        "What is a problem?; Problem decomposition; Identifying constraints; Inputs; Outputs; Desired state; Breaking large problems into smaller problems",
        ['CS.L1.1'],
        100,
        0.18,
        0.12,
        0.1,
        0.16,
    ),
    (
        "cs.l1.algorithms",
        "Algorithms (thinking)",
        "Algorithms",
        "comp_thinking",
        "What is an algorithm?; Step-by-step instructions; Algorithms in everyday life; Precision; Determinism; Termination; Correctness",
        ['CS.L1.2'],
        110,
        0.18,
        0.12,
        0.1,
        0.16,
    ),
    (
        "cs.l1.abstraction",
        "Abstraction",
        "Abstraction",
        "comp_thinking",
        "What is abstraction?; Ignoring irrelevant detail; Models; Interfaces; Layers; Encapsulation; Generalization",
        ['CS.L1.3'],
        120,
        0.18,
        0.12,
        0.1,
        0.16,
    ),
    (
        "cs.l1.pattern_recognition",
        "Pattern recognition",
        "Patterns",
        "comp_thinking",
        "Identifying patterns; Repetition; Sequences; Similarity; Generalization",
        ['CS.L1.4'],
        130,
        0.18,
        0.12,
        0.1,
        0.16,
    ),
    (
        "cs.l1.logical_thinking",
        "Logical thinking",
        "Logic",
        "comp_thinking",
        "Statements; Conditions; AND; OR; NOT; Truth; Logical implication; Contradiction; Equivalence",
        ['CS.L1.5'],
        140,
        0.18,
        0.12,
        0.1,
        0.16,
    ),
    (
        "cs.l1.representation",
        "Computational representation",
        "Represent",
        "comp_thinking",
        "Symbols; Numbers; Text; Images; Sound; Instructions; State",
        ['CS.L1.6'],
        150,
        0.18,
        0.12,
        0.1,
        0.16,
    ),
    (
        "cs.l2.history",
        "History of computing",
        "History",
        "cs_foundations",
        "Counting systems; Abacus; Mechanical calculators; Analytical Engine; Early computers; Turing; Von Neumann; Transistors; Integrated circuits; Personal computers; +4 more",
        ['CS.L2.1'],
        160,
        0.22,
        0.12,
        0.08,
        0.18,
    ),
    (
        "cs.l2.number_systems",
        "Number systems",
        "Binary & bases",
        "cs_foundations",
        "Decimal; Binary; Octal; Hexadecimal; Base conversion; Binary arithmetic; Signed numbers; Two's complement",
        ['CS.L2.2'],
        170,
        0.14,
        0.11,
        0.1,
        0.14,
    ),
    (
        "cs.l2.data_representation",
        "Data representation",
        "Data bits",
        "cs_foundations",
        "Bits; Bytes; Words; Integers; Floating point; Characters; ASCII; Unicode; Strings; Boolean values; +3 more",
        ['CS.L2.3'],
        180,
        0.14,
        0.11,
        0.1,
        0.14,
    ),
    (
        "cs.l2.boolean",
        "Boolean algebra",
        "Boolean",
        "cs_foundations",
        "Boolean variables; AND; OR; NOT; XOR; NAND; NOR; Truth tables; Boolean expressions; Boolean simplification",
        ['CS.L2.4'],
        190,
        0.14,
        0.11,
        0.1,
        0.14,
    ),
    (
        "cs.l2.digital_logic",
        "Digital logic",
        "Logic gates",
        "cs_foundations",
        "Logic gates; Combinational circuits; Adders; Multiplexers; Decoders; Comparators; Sequential circuits; Flip-flops; Registers; Counters",
        ['CS.L2.5'],
        200,
        0.12,
        0.1,
        0.11,
        0.14,
    ),
    (
        "cs.l2.how_computers_work",
        "How a computer actually works",
        "Inside the machine",
        "cs_foundations",
        "Machine instructions; CPU; Registers; ALU; Control unit; Program counter; Instruction cycle; Fetch; Decode; Execute; +2 more",
        ['CS.L2.6'],
        210,
        0.12,
        0.1,
        0.11,
        0.14,
    ),
    (
        "cs.l3.prog_concepts",
        "Programming concepts",
        "What is code?",
        "programming",
        "What is a program?; Source code; Compiler; Interpreter; Runtime; Syntax; Semantics; Errors; Debugging",
        ['CS.L3.1'],
        220,
        0.14,
        0.12,
        0.1,
        0.15,
    ),
    (
        "cs.l3.variables",
        "Variables",
        "Variables",
        "programming",
        "Variables; Values; Assignment; Naming; Types; Constants; Scope",
        ['CS.L3.2'],
        230,
        0.14,
        0.12,
        0.1,
        0.15,
    ),
    (
        "cs.l3.types",
        "Primitive types",
        "Types",
        "programming",
        "Integers; Floating point; Boolean; Strings; Characters; None/null concepts",
        ['CS.L3.3'],
        240,
        0.14,
        0.12,
        0.1,
        0.15,
    ),
    (
        "cs.l3.operators",
        "Operators",
        "Operators",
        "programming",
        "Arithmetic; Comparison; Logical; Assignment; Bitwise; Membership; Identity",
        ['CS.L3.4'],
        250,
        0.14,
        0.12,
        0.1,
        0.15,
    ),
    (
        "cs.l3.control_flow",
        "Control flow",
        "If & loops",
        "programming",
        "Sequential execution; Conditions; if; elif; else; loops; while; for; break; continue",
        ['CS.L3.5'],
        260,
        0.12,
        0.11,
        0.11,
        0.14,
    ),
    (
        "cs.l3.functions",
        "Functions",
        "Functions",
        "programming",
        "Function definition; Parameters; Arguments; Return values; Local variables; Scope; Pure functions; Side effects; Recursion",
        ['CS.L3.6'],
        270,
        0.12,
        0.11,
        0.11,
        0.14,
    ),
    (
        "cs.l3.data_structures_intro",
        "Data structures (intro)",
        "Lists & maps",
        "programming",
        "Arrays/lists; Tuples; Sets; Dictionaries/maps; Strings; Stacks; Queues",
        ['CS.L3.7'],
        280,
        0.12,
        0.11,
        0.11,
        0.14,
    ),
    (
        "cs.l3.debugging",
        "Errors & debugging",
        "Debug",
        "programming",
        "Syntax errors; Runtime errors; Logic errors; Exceptions; Stack traces; Debuggers; Logging; Assertions; Defensive programming",
        ['CS.L3.8'],
        290,
        0.14,
        0.12,
        0.1,
        0.15,
    ),
    (
        "cs.l3.files_io",
        "Program files & I/O",
        "File I/O",
        "programming",
        "Reading files; Writing files; CSV; JSON; Serialization; Deserialization",
        ['CS.L3.9'],
        300,
        0.14,
        0.12,
        0.1,
        0.15,
    ),
    (
        "cs.l3.modules",
        "Modules & packages",
        "Modules",
        "programming",
        "Modules; Packages; Imports; Dependencies; Package managers; Virtual environments",
        ['CS.L3.10'],
        310,
        0.14,
        0.12,
        0.1,
        0.15,
    ),
    (
        "cs.l4.algorithm_analysis",
        "Algorithm analysis",
        "Big-O intro",
        "algorithms",
        "Correctness; Efficiency; Time complexity; Space complexity; Big O; Big Ω; Big Θ; Best case; Worst case; Average case; +1 more",
        ['CS.L4.1'],
        320,
        0.11,
        0.1,
        0.11,
        0.13,
    ),
    (
        "cs.l4.searching",
        "Searching",
        "Search",
        "algorithms",
        "Linear search; Binary search; Hash-based lookup; Search trees",
        ['CS.L4.2'],
        330,
        0.11,
        0.1,
        0.11,
        0.13,
    ),
    (
        "cs.l4.sorting",
        "Sorting",
        "Sort",
        "algorithms",
        "Bubble sort; Selection sort; Insertion sort; Merge sort; Quick sort; Heap sort; Counting sort; Radix sort",
        ['CS.L4.3'],
        340,
        0.11,
        0.1,
        0.11,
        0.13,
    ),
    (
        "cs.l4.fundamental_ds",
        "Fundamental data structures",
        "Core structures",
        "algorithms",
        "Arrays; Linked lists; Stacks; Queues; Deques; Hash tables; Trees; Heaps; Graphs",
        ['CS.L4.4'],
        350,
        0.11,
        0.1,
        0.11,
        0.13,
    ),
    (
        "cs.l4.trees",
        "Trees",
        "Trees",
        "algorithms",
        "Binary trees; Binary search trees; AVL trees; Red-black trees; B-trees; Tries; Segment trees; Fenwick trees",
        ['CS.L4.5'],
        360,
        0.11,
        0.1,
        0.11,
        0.13,
    ),
    (
        "cs.l4.graphs",
        "Graphs",
        "Graphs",
        "algorithms",
        "Directed graphs; Undirected graphs; Weighted graphs; Adjacency matrices; Adjacency lists; BFS; DFS; Shortest path; Dijkstra; Bellman-Ford; +5 more",
        ['CS.L4.6'],
        370,
        0.11,
        0.1,
        0.11,
        0.13,
    ),
    (
        "cs.l4.algorithmic_paradigms",
        "Algorithmic paradigms",
        "Paradigms",
        "algorithms",
        "Brute force; Divide and conquer; Greedy algorithms; Dynamic programming; Backtracking; Branch and bound; Randomized algorithms",
        ['CS.L4.7'],
        380,
        0.11,
        0.1,
        0.11,
        0.13,
    ),
    (
        "cs.l4.advanced_algorithms",
        "Advanced algorithms",
        "Advanced algos",
        "algorithms",
        "String algorithms; Computational geometry; Network flow; Matching; Approximation algorithms; Online algorithms; Streaming algorithms; External-memory algorithms; Parallel algorithms",
        ['CS.L4.8'],
        390,
        0.11,
        0.1,
        0.11,
        0.13,
    ),
    (
        "cs.l5.math_foundations",
        "Mathematics foundations",
        "Math foundations",
        "math_for_cs",
        "Arithmetic; Fractions; Ratios; Percentages; Algebra; Equations; Functions; Graphs",
        ['CS.L5.1'],
        400,
        0.1,
        0.1,
        0.12,
        0.12,
    ),
    (
        "cs.l5.discrete_math",
        "Discrete mathematics",
        "Discrete math",
        "math_for_cs",
        "Propositions; Predicates; Quantifiers; Proofs; Inference; Sets; Subsets; Union; Intersection; Difference; +7 more",
        ['CS.L5.2'],
        410,
        0.1,
        0.1,
        0.12,
        0.12,
    ),
    (
        "cs.l5.proof_techniques",
        "Proof techniques",
        "Proofs",
        "math_for_cs",
        "Direct proof; Contradiction; Contrapositive; Mathematical induction; Strong induction; Structural induction",
        ['CS.L5.3'],
        420,
        0.1,
        0.1,
        0.12,
        0.12,
    ),
    (
        "cs.l5.combinatorics",
        "Combinatorics",
        "Counting",
        "math_for_cs",
        "Counting; Permutations; Combinations; Pigeonhole principle; Recurrences; Generating functions",
        ['CS.L5.4'],
        430,
        0.1,
        0.1,
        0.12,
        0.12,
    ),
    (
        "cs.l5.probability",
        "Probability",
        "Probability",
        "math_for_cs",
        "Probability; Conditional probability; Bayes' theorem; Random variables; Expected value; Variance; Distributions",
        ['CS.L5.5'],
        440,
        0.1,
        0.1,
        0.12,
        0.12,
    ),
    (
        "cs.l5.statistics",
        "Statistics",
        "Statistics",
        "math_for_cs",
        "Descriptive statistics; Sampling; Estimation; Hypothesis testing; Regression; Correlation",
        ['CS.L5.6'],
        450,
        0.1,
        0.1,
        0.12,
        0.12,
    ),
    (
        "cs.l5.linear_algebra",
        "Linear algebra",
        "Linear algebra",
        "math_for_cs",
        "Vectors; Matrices; Linear transformations; Eigenvalues; Eigenvectors; Matrix decomposition; Vector spaces",
        ['CS.L5.7'],
        460,
        0.1,
        0.1,
        0.12,
        0.12,
    ),
    (
        "cs.l5.calculus",
        "Calculus",
        "Calculus",
        "math_for_cs",
        "Limits; Derivatives; Integrals; Multivariable calculus; Gradients; Optimization",
        ['CS.L5.8'],
        470,
        0.1,
        0.1,
        0.12,
        0.12,
    ),
]

# (skill_slug, prerequisite_slug, strength)
PREREQS: List[Tuple[str, str, str]] = [
    ("cs.l0.what_is_computer", "cs.l0.tech_basics", "required"),
    ("cs.l0.computer_types", "cs.l0.what_is_computer", "required"),
    ("cs.l0.hardware", "cs.l0.what_is_computer", "required"),
    ("cs.l0.software", "cs.l0.what_is_computer", "required"),
    ("cs.l0.software", "cs.l0.hardware", "recommended"),
    ("cs.l0.files_folders", "cs.l0.software", "required"),
    ("cs.l0.operate_computer", "cs.l0.software", "required"),
    ("cs.l0.operate_computer", "cs.l0.files_folders", "recommended"),
    ("cs.l0.internet_literacy", "cs.l0.operate_computer", "recommended"),
    ("cs.l0.internet_literacy", "cs.l0.tech_basics", "required"),
    ("cs.l0.digital_safety", "cs.l0.internet_literacy", "required"),
    ("cs.l1.problem_solving", "cs.l0.tech_basics", "required"),
    ("cs.l1.algorithms", "cs.l1.problem_solving", "required"),
    ("cs.l1.abstraction", "cs.l1.problem_solving", "required"),
    ("cs.l1.pattern_recognition", "cs.l1.problem_solving", "required"),
    ("cs.l1.logical_thinking", "cs.l1.problem_solving", "required"),
    ("cs.l1.representation", "cs.l1.abstraction", "required"),
    ("cs.l1.representation", "cs.l1.algorithms", "recommended"),
    ("cs.l2.history", "cs.l0.what_is_computer", "recommended"),
    ("cs.l2.number_systems", "cs.l1.logical_thinking", "required"),
    ("cs.l2.number_systems", "cs.l0.hardware", "recommended"),
    ("cs.l2.data_representation", "cs.l2.number_systems", "required"),
    ("cs.l2.boolean", "cs.l1.logical_thinking", "required"),
    ("cs.l2.digital_logic", "cs.l2.boolean", "required"),
    ("cs.l2.digital_logic", "cs.l2.number_systems", "recommended"),
    ("cs.l2.how_computers_work", "cs.l0.hardware", "required"),
    ("cs.l2.how_computers_work", "cs.l2.digital_logic", "recommended"),
    ("cs.l2.how_computers_work", "cs.l2.data_representation", "recommended"),
    ("cs.l3.prog_concepts", "cs.l1.algorithms", "required"),
    ("cs.l3.prog_concepts", "cs.l0.software", "required"),
    ("cs.l3.variables", "cs.l3.prog_concepts", "required"),
    ("cs.l3.types", "cs.l3.variables", "required"),
    ("cs.l3.operators", "cs.l3.types", "required"),
    ("cs.l3.control_flow", "cs.l3.operators", "required"),
    ("cs.l3.control_flow", "cs.l1.logical_thinking", "recommended"),
    ("cs.l3.functions", "cs.l3.control_flow", "required"),
    ("cs.l3.data_structures_intro", "cs.l3.variables", "required"),
    ("cs.l3.data_structures_intro", "cs.l3.functions", "recommended"),
    ("cs.l3.debugging", "cs.l3.control_flow", "required"),
    ("cs.l3.files_io", "cs.l3.functions", "required"),
    ("cs.l3.files_io", "cs.l0.files_folders", "recommended"),
    ("cs.l3.modules", "cs.l3.functions", "required"),
    ("cs.l4.algorithm_analysis", "cs.l3.control_flow", "required"),
    ("cs.l4.algorithm_analysis", "cs.l1.algorithms", "required"),
    ("cs.l4.searching", "cs.l3.data_structures_intro", "required"),
    ("cs.l4.searching", "cs.l4.algorithm_analysis", "recommended"),
    ("cs.l4.sorting", "cs.l4.searching", "recommended"),
    ("cs.l4.sorting", "cs.l3.data_structures_intro", "required"),
    ("cs.l4.fundamental_ds", "cs.l3.data_structures_intro", "required"),
    ("cs.l4.trees", "cs.l4.fundamental_ds", "required"),
    ("cs.l4.graphs", "cs.l4.fundamental_ds", "required"),
    ("cs.l4.algorithmic_paradigms", "cs.l4.algorithm_analysis", "required"),
    ("cs.l4.algorithmic_paradigms", "cs.l3.functions", "recommended"),
    ("cs.l4.advanced_algorithms", "cs.l4.algorithmic_paradigms", "required"),
    ("cs.l4.advanced_algorithms", "cs.l4.graphs", "recommended"),
    ("cs.l5.math_foundations", "cs.l1.logical_thinking", "recommended"),
    ("cs.l5.discrete_math", "cs.l2.boolean", "required"),
    ("cs.l5.discrete_math", "cs.l1.logical_thinking", "required"),
    ("cs.l5.discrete_math", "cs.l5.math_foundations", "recommended"),
    ("cs.l5.proof_techniques", "cs.l5.discrete_math", "required"),
    ("cs.l5.combinatorics", "cs.l5.math_foundations", "required"),
    ("cs.l5.combinatorics", "cs.l5.discrete_math", "recommended"),
    ("cs.l5.probability", "cs.l5.math_foundations", "required"),
    ("cs.l5.statistics", "cs.l5.probability", "required"),
    ("cs.l5.linear_algebra", "cs.l5.math_foundations", "required"),
    ("cs.l5.calculus", "cs.l5.math_foundations", "required"),
    ("cs.l5.calculus", "cs.l5.linear_algebra", "recommended"),
]

PILOT_SUBJECT = "Computer Science"
PILOT_COLOR = "#E8F1FB"
PILOT_ICON = "code"

# These are Kindling's own pilot curriculum references, not identifiers from an
# externally reviewed standards framework. Keep provenance attached anywhere
# the codes leave the seed module so reports cannot imply third-party alignment.
PILOT_STANDARD_FRAMEWORK = {
    "id": "kindling.cs-pilot.v1",
    "name": "Kindling Computer Science Pilot",
    "version": "1.0",
    "scope": "Computer Science pilot layers L0–L5",
    "source": "Computer Science.MD",
    "alignmentStatus": "internal_reference",
    "description": (
        "Kindling's internal curriculum references. They are not external "
        "standards codes and have not been independently alignment-reviewed."
    ),
}


def pilot_standard_crosswalk() -> List[Dict[str, str]]:
    """Return the stable internal code → pilot skill crosswalk."""
    rows: List[Dict[str, str]] = []
    for data in skill_dicts():
        for code in data["standard_codes"]:
            rows.append(
                {
                    "code": code,
                    "skillSlug": data["slug"],
                    "skillName": data["name"],
                }
            )
    return rows

# lesson name → list of (skill_slug, weight, is_primary)
TOPIC_SKILLS: Dict[str, List[Tuple[str, float, bool]]] = {
    "Understanding technology": [
        ("cs.l0.tech_basics", 1.0, True),
    ],
    "What is a computer?": [
        ("cs.l0.what_is_computer", 1.0, True),
    ],
    "Types of computers": [
        ("cs.l0.computer_types", 1.0, True),
    ],
    "Computer hardware": [
        ("cs.l0.hardware", 1.0, True),
    ],
    "Computer software": [
        ("cs.l0.software", 1.0, True),
    ],
    "Files & folders": [
        ("cs.l0.files_folders", 1.0, True),
    ],
    "Operating a computer": [
        ("cs.l0.operate_computer", 1.0, True),
    ],
    "Internet literacy": [
        ("cs.l0.internet_literacy", 1.0, True),
    ],
    "Digital safety": [
        ("cs.l0.digital_safety", 1.0, True),
    ],
    "Problem solving": [
        ("cs.l1.problem_solving", 1.0, True),
    ],
    "Algorithms (thinking)": [
        ("cs.l1.algorithms", 1.0, True),
    ],
    "Abstraction": [
        ("cs.l1.abstraction", 1.0, True),
    ],
    "Pattern recognition": [
        ("cs.l1.pattern_recognition", 1.0, True),
    ],
    "Logical thinking": [
        ("cs.l1.logical_thinking", 1.0, True),
    ],
    "Computational representation": [
        ("cs.l1.representation", 1.0, True),
    ],
    "History of computing": [
        ("cs.l2.history", 1.0, True),
    ],
    "Number systems": [
        ("cs.l2.number_systems", 1.0, True),
    ],
    "Data representation": [
        ("cs.l2.data_representation", 1.0, True),
    ],
    "Boolean algebra": [
        ("cs.l2.boolean", 1.0, True),
    ],
    "Digital logic": [
        ("cs.l2.digital_logic", 1.0, True),
    ],
    "How a computer actually works": [
        ("cs.l2.how_computers_work", 1.0, True),
    ],
    "Programming concepts": [
        ("cs.l3.prog_concepts", 1.0, True),
    ],
    "Variables": [
        ("cs.l3.variables", 1.0, True),
    ],
    "Primitive types": [
        ("cs.l3.types", 1.0, True),
    ],
    "Operators": [
        ("cs.l3.operators", 1.0, True),
    ],
    "Control flow": [
        ("cs.l3.control_flow", 1.0, True),
    ],
    "Functions": [
        ("cs.l3.functions", 1.0, True),
    ],
    "Data structures (intro)": [
        ("cs.l3.data_structures_intro", 1.0, True),
    ],
    "Errors & debugging": [
        ("cs.l3.debugging", 1.0, True),
    ],
    "Program files & I/O": [
        ("cs.l3.files_io", 1.0, True),
    ],
    "Modules & packages": [
        ("cs.l3.modules", 1.0, True),
    ],
    "Algorithm analysis": [
        ("cs.l4.algorithm_analysis", 1.0, True),
    ],
    "Searching": [
        ("cs.l4.searching", 1.0, True),
    ],
    "Sorting": [
        ("cs.l4.sorting", 1.0, True),
    ],
    "Fundamental data structures": [
        ("cs.l4.fundamental_ds", 1.0, True),
    ],
    "Trees": [
        ("cs.l4.trees", 1.0, True),
    ],
    "Graphs": [
        ("cs.l4.graphs", 1.0, True),
    ],
    "Algorithmic paradigms": [
        ("cs.l4.algorithmic_paradigms", 1.0, True),
    ],
    "Advanced algorithms": [
        ("cs.l4.advanced_algorithms", 1.0, True),
    ],
    "Mathematics foundations": [
        ("cs.l5.math_foundations", 1.0, True),
    ],
    "Discrete mathematics": [
        ("cs.l5.discrete_math", 1.0, True),
    ],
    "Proof techniques": [
        ("cs.l5.proof_techniques", 1.0, True),
    ],
    "Combinatorics": [
        ("cs.l5.combinatorics", 1.0, True),
    ],
    "Probability": [
        ("cs.l5.probability", 1.0, True),
    ],
    "Statistics": [
        ("cs.l5.statistics", 1.0, True),
    ],
    "Linear algebra": [
        ("cs.l5.linear_algebra", 1.0, True),
    ],
    "Calculus": [
        ("cs.l5.calculus", 1.0, True),
    ],
}

# Subject → Topic (unit / layer) → Subtopic (lesson = Lx.y).
# Each subtopic is a dict: name, code, skill, learning_goal, concepts.
PILOT_UNITS: List[Dict[str, Any]] = [
    {
        "name": "Digital & computer literacy",
        "layer": "L0",
        "learning_goal": "Use computers confidently with no prior technical background — from what technology is through files, the internet, and digital safety.",
        "subtopics": [
            {
                "name": "Understanding technology",
                "code": "L0.1",
                "skill": "cs.l0.tech_basics",
                "learning_goal": "Build a clear foundation in Understanding technology.\n\nCover these ideas:\n• What is technology?\n• What is information?\n• What is data?\n• What is a digital device?\n• Analog vs digital\n• Digital information\n• Digital representation\n• Computers in everyday life\n• Examples of computers\n• Why computers exist\n• What computers are good at\n• What computers cannot inherently do",
                "concepts": ["What is technology?", "What is information?", "What is data?", "What is a digital device?", "Analog vs digital", "Digital information", "Digital representation", "Computers in everyday life", "Examples of computers", "Why computers exist", "What computers are good at", "What computers cannot inherently do"],
            },
            {
                "name": "What is a computer?",
                "code": "L0.2",
                "skill": "cs.l0.what_is_computer",
                "learning_goal": "Build a clear foundation in What is a computer?.\n\nCover these ideas:\n• Definition of a computer\n• Input\n• Processing\n• Output\n• Storage\n• Communication\n• Hardware\n• Software\n• Users\n• Computer systems",
                "concepts": ["Definition of a computer", "Input", "Processing", "Output", "Storage", "Communication", "Hardware", "Software", "Users", "Computer systems"],
            },
            {
                "name": "Types of computers",
                "code": "L0.3",
                "skill": "cs.l0.computer_types",
                "learning_goal": "Build a clear foundation in Types of computers.\n\nCover these ideas:\n• Desktop computers\n• Laptops\n• Tablets\n• Smartphones\n• Servers\n• Mainframes\n• Supercomputers\n• Embedded computers\n• Microcontrollers\n• Game consoles\n• IoT devices\n• Wearables\n• Automotive computers\n• Industrial computers",
                "concepts": ["Desktop computers", "Laptops", "Tablets", "Smartphones", "Servers", "Mainframes", "Supercomputers", "Embedded computers", "Microcontrollers", "Game consoles", "IoT devices", "Wearables", "Automotive computers", "Industrial computers"],
            },
            {
                "name": "Computer hardware",
                "code": "L0.4",
                "skill": "cs.l0.hardware",
                "learning_goal": "Build a clear foundation in Computer hardware.\n\nCover these ideas:\n• CPU\n• RAM\n• Storage\n• Motherboard\n• GPU\n• Power supply\n• Network interface\n• Cooling\n• Display\n• Keyboard\n• Mouse\n• Touchscreen\n• Speakers\n• Microphone\n• Camera\n• What each component does\n• How components interact\n• Temporary vs persistent storage\n• Processing vs storage\n• CPU vs GPU",
                "concepts": ["CPU", "RAM", "Storage", "Motherboard", "GPU", "Power supply", "Network interface", "Cooling", "Display", "Keyboard", "Mouse", "Touchscreen", "Speakers", "Microphone", "Camera", "What each component does", "How components interact", "Temporary vs persistent storage", "Processing vs storage", "CPU vs GPU"],
            },
            {
                "name": "Computer software",
                "code": "L0.5",
                "skill": "cs.l0.software",
                "learning_goal": "Build a clear foundation in Computer software.\n\nCover these ideas:\n• Operating systems\n• Applications\n• Drivers\n• Utilities\n• Firmware\n• System software\n• Application software\n• Files\n• Processes\n• Programs",
                "concepts": ["Operating systems", "Applications", "Drivers", "Utilities", "Firmware", "System software", "Application software", "Files", "Processes", "Programs"],
            },
            {
                "name": "Files & folders",
                "code": "L0.6",
                "skill": "cs.l0.files_folders",
                "learning_goal": "Build a clear foundation in Files & folders.\n\nCover these ideas:\n• Files\n• File names\n• File extensions\n• Directories\n• Paths\n• File types\n• File permissions\n• Copying\n• Moving\n• Renaming\n• Deleting\n• Compression\n• Archives\n• Backups",
                "concepts": ["Files", "File names", "File extensions", "Directories", "Paths", "File types", "File permissions", "Copying", "Moving", "Renaming", "Deleting", "Compression", "Archives", "Backups"],
            },
            {
                "name": "Operating a computer",
                "code": "L0.7",
                "skill": "cs.l0.operate_computer",
                "learning_goal": "Build a clear foundation in Operating a computer.\n\nCover these ideas:\n• Desktop environments\n• Windows/Linux/macOS concepts\n• Applications\n• Windows\n• Menus\n• Settings\n• Installing software\n• Updating software\n• Uninstalling software\n• Basic troubleshooting",
                "concepts": ["Desktop environments", "Windows/Linux/macOS concepts", "Applications", "Windows", "Menus", "Settings", "Installing software", "Updating software", "Uninstalling software", "Basic troubleshooting"],
            },
            {
                "name": "Internet literacy",
                "code": "L0.8",
                "skill": "cs.l0.internet_literacy",
                "learning_goal": "Build a clear foundation in Internet literacy.\n\nCover these ideas:\n• Internet\n• Web\n• Browser\n• Search engine\n• Website\n• URL\n• Domain\n• Web page\n• Hyperlink\n• Download\n• Upload\n• Cloud services\n• Email\n• Messaging",
                "concepts": ["Internet", "Web", "Browser", "Search engine", "Website", "URL", "Domain", "Web page", "Hyperlink", "Download", "Upload", "Cloud services", "Email", "Messaging"],
            },
            {
                "name": "Digital safety",
                "code": "L0.9",
                "skill": "cs.l0.digital_safety",
                "learning_goal": "Build a clear foundation in Digital safety.\n\nCover these ideas:\n• Passwords\n• MFA\n• Phishing\n• Malware\n• Scams\n• Privacy\n• Personal data\n• Digital identity\n• Safe browsing\n• Social engineering\n• Backups",
                "concepts": ["Passwords", "MFA", "Phishing", "Malware", "Scams", "Privacy", "Personal data", "Digital identity", "Safe browsing", "Social engineering", "Backups"],
            },
        ],
    },
    {
        "name": "Computational thinking",
        "layer": "L1",
        "learning_goal": "Bridge from using computers to thinking like a computer scientist: problems, algorithms, abstraction, patterns, logic, and representation.",
        "subtopics": [
            {
                "name": "Problem solving",
                "code": "L1.1",
                "skill": "cs.l1.problem_solving",
                "learning_goal": "Build a clear foundation in Problem solving.\n\nCover these ideas:\n• What is a problem?\n• Problem decomposition\n• Identifying constraints\n• Inputs\n• Outputs\n• Desired state\n• Breaking large problems into smaller problems",
                "concepts": ["What is a problem?", "Problem decomposition", "Identifying constraints", "Inputs", "Outputs", "Desired state", "Breaking large problems into smaller problems"],
            },
            {
                "name": "Algorithms (thinking)",
                "code": "L1.2",
                "skill": "cs.l1.algorithms",
                "learning_goal": "Build a clear foundation in Algorithms (thinking).\n\nCover these ideas:\n• What is an algorithm?\n• Step-by-step instructions\n• Algorithms in everyday life\n• Precision\n• Determinism\n• Termination\n• Correctness",
                "concepts": ["What is an algorithm?", "Step-by-step instructions", "Algorithms in everyday life", "Precision", "Determinism", "Termination", "Correctness"],
            },
            {
                "name": "Abstraction",
                "code": "L1.3",
                "skill": "cs.l1.abstraction",
                "learning_goal": "Build a clear foundation in Abstraction.\n\nCover these ideas:\n• What is abstraction?\n• Ignoring irrelevant detail\n• Models\n• Interfaces\n• Layers\n• Encapsulation\n• Generalization",
                "concepts": ["What is abstraction?", "Ignoring irrelevant detail", "Models", "Interfaces", "Layers", "Encapsulation", "Generalization"],
            },
            {
                "name": "Pattern recognition",
                "code": "L1.4",
                "skill": "cs.l1.pattern_recognition",
                "learning_goal": "Build a clear foundation in Pattern recognition.\n\nCover these ideas:\n• Identifying patterns\n• Repetition\n• Sequences\n• Similarity\n• Generalization",
                "concepts": ["Identifying patterns", "Repetition", "Sequences", "Similarity", "Generalization"],
            },
            {
                "name": "Logical thinking",
                "code": "L1.5",
                "skill": "cs.l1.logical_thinking",
                "learning_goal": "Build a clear foundation in Logical thinking.\n\nCover these ideas:\n• Statements\n• Conditions\n• AND\n• OR\n• NOT\n• Truth\n• Logical implication\n• Contradiction\n• Equivalence",
                "concepts": ["Statements", "Conditions", "AND", "OR", "NOT", "Truth", "Logical implication", "Contradiction", "Equivalence"],
            },
            {
                "name": "Computational representation",
                "code": "L1.6",
                "skill": "cs.l1.representation",
                "learning_goal": "Build a clear foundation in Computational representation.\n\nCover these ideas:\n• Symbols\n• Numbers\n• Text\n• Images\n• Sound\n• Instructions\n• State",
                "concepts": ["Symbols", "Numbers", "Text", "Images", "Sound", "Instructions", "State"],
            },
        ],
    },
    {
        "name": "Computer science foundations",
        "layer": "L2",
        "learning_goal": "Study the science of computing: history, number systems, data representation, Boolean algebra, digital logic, and how a computer actually works.",
        "subtopics": [
            {
                "name": "History of computing",
                "code": "L2.1",
                "skill": "cs.l2.history",
                "learning_goal": "Build a clear foundation in History of computing.\n\nCover these ideas:\n• Counting systems\n• Abacus\n• Mechanical calculators\n• Analytical Engine\n• Early computers\n• Turing\n• Von Neumann\n• Transistors\n• Integrated circuits\n• Personal computers\n• Internet\n• Mobile computing\n• Cloud computing\n• AI era",
                "concepts": ["Counting systems", "Abacus", "Mechanical calculators", "Analytical Engine", "Early computers", "Turing", "Von Neumann", "Transistors", "Integrated circuits", "Personal computers", "Internet", "Mobile computing", "Cloud computing", "AI era"],
            },
            {
                "name": "Number systems",
                "code": "L2.2",
                "skill": "cs.l2.number_systems",
                "learning_goal": "Build a clear foundation in Number systems.\n\nCover these ideas:\n• Decimal\n• Binary\n• Octal\n• Hexadecimal\n• Base conversion\n• Binary arithmetic\n• Signed numbers\n• Two's complement",
                "concepts": ["Decimal", "Binary", "Octal", "Hexadecimal", "Base conversion", "Binary arithmetic", "Signed numbers", "Two's complement"],
            },
            {
                "name": "Data representation",
                "code": "L2.3",
                "skill": "cs.l2.data_representation",
                "learning_goal": "Build a clear foundation in Data representation.\n\nCover these ideas:\n• Bits\n• Bytes\n• Words\n• Integers\n• Floating point\n• Characters\n• ASCII\n• Unicode\n• Strings\n• Boolean values\n• Images\n• Audio\n• Video",
                "concepts": ["Bits", "Bytes", "Words", "Integers", "Floating point", "Characters", "ASCII", "Unicode", "Strings", "Boolean values", "Images", "Audio", "Video"],
            },
            {
                "name": "Boolean algebra",
                "code": "L2.4",
                "skill": "cs.l2.boolean",
                "learning_goal": "Build a clear foundation in Boolean algebra.\n\nCover these ideas:\n• Boolean variables\n• AND\n• OR\n• NOT\n• XOR\n• NAND\n• NOR\n• Truth tables\n• Boolean expressions\n• Boolean simplification",
                "concepts": ["Boolean variables", "AND", "OR", "NOT", "XOR", "NAND", "NOR", "Truth tables", "Boolean expressions", "Boolean simplification"],
            },
            {
                "name": "Digital logic",
                "code": "L2.5",
                "skill": "cs.l2.digital_logic",
                "learning_goal": "Build a clear foundation in Digital logic.\n\nCover these ideas:\n• Logic gates\n• Combinational circuits\n• Adders\n• Multiplexers\n• Decoders\n• Comparators\n• Sequential circuits\n• Flip-flops\n• Registers\n• Counters",
                "concepts": ["Logic gates", "Combinational circuits", "Adders", "Multiplexers", "Decoders", "Comparators", "Sequential circuits", "Flip-flops", "Registers", "Counters"],
            },
            {
                "name": "How a computer actually works",
                "code": "L2.6",
                "skill": "cs.l2.how_computers_work",
                "learning_goal": "Build a clear foundation in How a computer actually works.\n\nCover these ideas:\n• Machine instructions\n• CPU\n• Registers\n• ALU\n• Control unit\n• Program counter\n• Instruction cycle\n• Fetch\n• Decode\n• Execute\n• Memory access\n• Interrupts",
                "concepts": ["Machine instructions", "CPU", "Registers", "ALU", "Control unit", "Program counter", "Instruction cycle", "Fetch", "Decode", "Execute", "Memory access", "Interrupts"],
            },
        ],
    },
    {
        "name": "Programming foundations",
        "layer": "L3",
        "learning_goal": "Create software with language-independent concepts (Python-first): programs, variables, types, operators, control flow, functions, data structures, debugging, files, and modules.",
        "subtopics": [
            {
                "name": "Programming concepts",
                "code": "L3.1",
                "skill": "cs.l3.prog_concepts",
                "learning_goal": "Build a clear foundation in Programming concepts.\n\nCover these ideas:\n• What is a program?\n• Source code\n• Compiler\n• Interpreter\n• Runtime\n• Syntax\n• Semantics\n• Errors\n• Debugging",
                "concepts": ["What is a program?", "Source code", "Compiler", "Interpreter", "Runtime", "Syntax", "Semantics", "Errors", "Debugging"],
            },
            {
                "name": "Variables",
                "code": "L3.2",
                "skill": "cs.l3.variables",
                "learning_goal": "Build a clear foundation in Variables.\n\nCover these ideas:\n• Variables\n• Values\n• Assignment\n• Naming\n• Types\n• Constants\n• Scope",
                "concepts": ["Variables", "Values", "Assignment", "Naming", "Types", "Constants", "Scope"],
            },
            {
                "name": "Primitive types",
                "code": "L3.3",
                "skill": "cs.l3.types",
                "learning_goal": "Build a clear foundation in Primitive types.\n\nCover these ideas:\n• Integers\n• Floating point\n• Boolean\n• Strings\n• Characters\n• None/null concepts",
                "concepts": ["Integers", "Floating point", "Boolean", "Strings", "Characters", "None/null concepts"],
            },
            {
                "name": "Operators",
                "code": "L3.4",
                "skill": "cs.l3.operators",
                "learning_goal": "Build a clear foundation in Operators.\n\nCover these ideas:\n• Arithmetic\n• Comparison\n• Logical\n• Assignment\n• Bitwise\n• Membership\n• Identity",
                "concepts": ["Arithmetic", "Comparison", "Logical", "Assignment", "Bitwise", "Membership", "Identity"],
            },
            {
                "name": "Control flow",
                "code": "L3.5",
                "skill": "cs.l3.control_flow",
                "learning_goal": "Build a clear foundation in Control flow.\n\nCover these ideas:\n• Sequential execution\n• Conditions\n• if\n• elif\n• else\n• loops\n• while\n• for\n• break\n• continue",
                "concepts": ["Sequential execution", "Conditions", "if", "elif", "else", "loops", "while", "for", "break", "continue"],
            },
            {
                "name": "Functions",
                "code": "L3.6",
                "skill": "cs.l3.functions",
                "learning_goal": "Build a clear foundation in Functions.\n\nCover these ideas:\n• Function definition\n• Parameters\n• Arguments\n• Return values\n• Local variables\n• Scope\n• Pure functions\n• Side effects\n• Recursion",
                "concepts": ["Function definition", "Parameters", "Arguments", "Return values", "Local variables", "Scope", "Pure functions", "Side effects", "Recursion"],
            },
            {
                "name": "Data structures (intro)",
                "code": "L3.7",
                "skill": "cs.l3.data_structures_intro",
                "learning_goal": "Build a clear foundation in Data structures (intro).\n\nCover these ideas:\n• Arrays/lists\n• Tuples\n• Sets\n• Dictionaries/maps\n• Strings\n• Stacks\n• Queues",
                "concepts": ["Arrays/lists", "Tuples", "Sets", "Dictionaries/maps", "Strings", "Stacks", "Queues"],
            },
            {
                "name": "Errors & debugging",
                "code": "L3.8",
                "skill": "cs.l3.debugging",
                "learning_goal": "Build a clear foundation in Errors & debugging.\n\nCover these ideas:\n• Syntax errors\n• Runtime errors\n• Logic errors\n• Exceptions\n• Stack traces\n• Debuggers\n• Logging\n• Assertions\n• Defensive programming",
                "concepts": ["Syntax errors", "Runtime errors", "Logic errors", "Exceptions", "Stack traces", "Debuggers", "Logging", "Assertions", "Defensive programming"],
            },
            {
                "name": "Program files & I/O",
                "code": "L3.9",
                "skill": "cs.l3.files_io",
                "learning_goal": "Build a clear foundation in Program files & I/O.\n\nCover these ideas:\n• Reading files\n• Writing files\n• CSV\n• JSON\n• Serialization\n• Deserialization",
                "concepts": ["Reading files", "Writing files", "CSV", "JSON", "Serialization", "Deserialization"],
            },
            {
                "name": "Modules & packages",
                "code": "L3.10",
                "skill": "cs.l3.modules",
                "learning_goal": "Build a clear foundation in Modules & packages.\n\nCover these ideas:\n• Modules\n• Packages\n• Imports\n• Dependencies\n• Package managers\n• Virtual environments",
                "concepts": ["Modules", "Packages", "Imports", "Dependencies", "Package managers", "Virtual environments"],
            },
        ],
    },
    {
        "name": "Algorithms & data structures",
        "layer": "L4",
        "learning_goal": "Analyze, search, sort, and structure data — trees, graphs, paradigms, and advanced algorithm families that form a central hub of CS.",
        "subtopics": [
            {
                "name": "Algorithm analysis",
                "code": "L4.1",
                "skill": "cs.l4.algorithm_analysis",
                "learning_goal": "Build a clear foundation in Algorithm analysis.\n\nCover these ideas:\n• Correctness\n• Efficiency\n• Time complexity\n• Space complexity\n• Big O\n• Big Ω\n• Big Θ\n• Best case\n• Worst case\n• Average case\n• Amortized analysis",
                "concepts": ["Correctness", "Efficiency", "Time complexity", "Space complexity", "Big O", "Big Ω", "Big Θ", "Best case", "Worst case", "Average case", "Amortized analysis"],
            },
            {
                "name": "Searching",
                "code": "L4.2",
                "skill": "cs.l4.searching",
                "learning_goal": "Build a clear foundation in Searching.\n\nCover these ideas:\n• Linear search\n• Binary search\n• Hash-based lookup\n• Search trees",
                "concepts": ["Linear search", "Binary search", "Hash-based lookup", "Search trees"],
            },
            {
                "name": "Sorting",
                "code": "L4.3",
                "skill": "cs.l4.sorting",
                "learning_goal": "Build a clear foundation in Sorting.\n\nCover these ideas:\n• Bubble sort\n• Selection sort\n• Insertion sort\n• Merge sort\n• Quick sort\n• Heap sort\n• Counting sort\n• Radix sort",
                "concepts": ["Bubble sort", "Selection sort", "Insertion sort", "Merge sort", "Quick sort", "Heap sort", "Counting sort", "Radix sort"],
            },
            {
                "name": "Fundamental data structures",
                "code": "L4.4",
                "skill": "cs.l4.fundamental_ds",
                "learning_goal": "Build a clear foundation in Fundamental data structures.\n\nCover these ideas:\n• Arrays\n• Linked lists\n• Stacks\n• Queues\n• Deques\n• Hash tables\n• Trees\n• Heaps\n• Graphs",
                "concepts": ["Arrays", "Linked lists", "Stacks", "Queues", "Deques", "Hash tables", "Trees", "Heaps", "Graphs"],
            },
            {
                "name": "Trees",
                "code": "L4.5",
                "skill": "cs.l4.trees",
                "learning_goal": "Build a clear foundation in Trees.\n\nCover these ideas:\n• Binary trees\n• Binary search trees\n• AVL trees\n• Red-black trees\n• B-trees\n• Tries\n• Segment trees\n• Fenwick trees",
                "concepts": ["Binary trees", "Binary search trees", "AVL trees", "Red-black trees", "B-trees", "Tries", "Segment trees", "Fenwick trees"],
            },
            {
                "name": "Graphs",
                "code": "L4.6",
                "skill": "cs.l4.graphs",
                "learning_goal": "Build a clear foundation in Graphs.\n\nCover these ideas:\n• Directed graphs\n• Undirected graphs\n• Weighted graphs\n• Adjacency matrices\n• Adjacency lists\n• BFS\n• DFS\n• Shortest path\n• Dijkstra\n• Bellman-Ford\n• Floyd-Warshall\n• Minimum spanning trees\n• Prim\n• Kruskal\n• Topological sorting",
                "concepts": ["Directed graphs", "Undirected graphs", "Weighted graphs", "Adjacency matrices", "Adjacency lists", "BFS", "DFS", "Shortest path", "Dijkstra", "Bellman-Ford", "Floyd-Warshall", "Minimum spanning trees", "Prim", "Kruskal", "Topological sorting"],
            },
            {
                "name": "Algorithmic paradigms",
                "code": "L4.7",
                "skill": "cs.l4.algorithmic_paradigms",
                "learning_goal": "Build a clear foundation in Algorithmic paradigms.\n\nCover these ideas:\n• Brute force\n• Divide and conquer\n• Greedy algorithms\n• Dynamic programming\n• Backtracking\n• Branch and bound\n• Randomized algorithms",
                "concepts": ["Brute force", "Divide and conquer", "Greedy algorithms", "Dynamic programming", "Backtracking", "Branch and bound", "Randomized algorithms"],
            },
            {
                "name": "Advanced algorithms",
                "code": "L4.8",
                "skill": "cs.l4.advanced_algorithms",
                "learning_goal": "Build a clear foundation in Advanced algorithms.\n\nCover these ideas:\n• String algorithms\n• Computational geometry\n• Network flow\n• Matching\n• Approximation algorithms\n• Online algorithms\n• Streaming algorithms\n• External-memory algorithms\n• Parallel algorithms",
                "concepts": ["String algorithms", "Computational geometry", "Network flow", "Matching", "Approximation algorithms", "Online algorithms", "Streaming algorithms", "External-memory algorithms", "Parallel algorithms"],
            },
        ],
    },
    {
        "name": "Mathematics for computer science",
        "layer": "L5",
        "learning_goal": "Connect math to the CS concepts that need it: foundations, discrete math, proofs, combinatorics, probability, statistics, linear algebra, and calculus.",
        "subtopics": [
            {
                "name": "Mathematics foundations",
                "code": "L5.1",
                "skill": "cs.l5.math_foundations",
                "learning_goal": "Build a clear foundation in Mathematics foundations.\n\nCover these ideas:\n• Arithmetic\n• Fractions\n• Ratios\n• Percentages\n• Algebra\n• Equations\n• Functions\n• Graphs",
                "concepts": ["Arithmetic", "Fractions", "Ratios", "Percentages", "Algebra", "Equations", "Functions", "Graphs"],
            },
            {
                "name": "Discrete mathematics",
                "code": "L5.2",
                "skill": "cs.l5.discrete_math",
                "learning_goal": "Build a clear foundation in Discrete mathematics.\n\nCover these ideas:\n• Propositions\n• Predicates\n• Quantifiers\n• Proofs\n• Inference\n• Sets\n• Subsets\n• Union\n• Intersection\n• Difference\n• Cartesian products\n• Relations\n• Equivalence relations\n• Partial orders\n• Injective\n• Surjective\n• Bijective",
                "concepts": ["Propositions", "Predicates", "Quantifiers", "Proofs", "Inference", "Sets", "Subsets", "Union", "Intersection", "Difference", "Cartesian products", "Relations", "Equivalence relations", "Partial orders", "Injective", "Surjective", "Bijective"],
            },
            {
                "name": "Proof techniques",
                "code": "L5.3",
                "skill": "cs.l5.proof_techniques",
                "learning_goal": "Build a clear foundation in Proof techniques.\n\nCover these ideas:\n• Direct proof\n• Contradiction\n• Contrapositive\n• Mathematical induction\n• Strong induction\n• Structural induction",
                "concepts": ["Direct proof", "Contradiction", "Contrapositive", "Mathematical induction", "Strong induction", "Structural induction"],
            },
            {
                "name": "Combinatorics",
                "code": "L5.4",
                "skill": "cs.l5.combinatorics",
                "learning_goal": "Build a clear foundation in Combinatorics.\n\nCover these ideas:\n• Counting\n• Permutations\n• Combinations\n• Pigeonhole principle\n• Recurrences\n• Generating functions",
                "concepts": ["Counting", "Permutations", "Combinations", "Pigeonhole principle", "Recurrences", "Generating functions"],
            },
            {
                "name": "Probability",
                "code": "L5.5",
                "skill": "cs.l5.probability",
                "learning_goal": "Build a clear foundation in Probability.\n\nCover these ideas:\n• Probability\n• Conditional probability\n• Bayes' theorem\n• Random variables\n• Expected value\n• Variance\n• Distributions",
                "concepts": ["Probability", "Conditional probability", "Bayes' theorem", "Random variables", "Expected value", "Variance", "Distributions"],
            },
            {
                "name": "Statistics",
                "code": "L5.6",
                "skill": "cs.l5.statistics",
                "learning_goal": "Build a clear foundation in Statistics.\n\nCover these ideas:\n• Descriptive statistics\n• Sampling\n• Estimation\n• Hypothesis testing\n• Regression\n• Correlation",
                "concepts": ["Descriptive statistics", "Sampling", "Estimation", "Hypothesis testing", "Regression", "Correlation"],
            },
            {
                "name": "Linear algebra",
                "code": "L5.7",
                "skill": "cs.l5.linear_algebra",
                "learning_goal": "Build a clear foundation in Linear algebra.\n\nCover these ideas:\n• Vectors\n• Matrices\n• Linear transformations\n• Eigenvalues\n• Eigenvectors\n• Matrix decomposition\n• Vector spaces",
                "concepts": ["Vectors", "Matrices", "Linear transformations", "Eigenvalues", "Eigenvectors", "Matrix decomposition", "Vector spaces"],
            },
            {
                "name": "Calculus",
                "code": "L5.8",
                "skill": "cs.l5.calculus",
                "learning_goal": "Build a clear foundation in Calculus.\n\nCover these ideas:\n• Limits\n• Derivatives\n• Integrals\n• Multivariable calculus\n• Gradients\n• Optimization",
                "concepts": ["Limits", "Derivatives", "Integrals", "Multivariable calculus", "Gradients", "Optimization"],
            },
        ],
    },
]

PILOT_TOPIC_ORDER: List[str] = []
for _unit in PILOT_UNITS:
    for _sub in _unit.get("subtopics") or []:
        if isinstance(_sub, dict):
            PILOT_TOPIC_ORDER.append(str(_sub["name"]))
        else:
            PILOT_TOPIC_ORDER.append(str(_sub))


def subtopic_name(sub: Any) -> str:
    """Normalize a PILOT_UNITS subtopic entry to its lesson name."""
    if isinstance(sub, dict):
        return str(sub.get("name") or "").strip()
    return str(sub or "").strip()


def subtopic_learning_goal(sub: Any) -> str:
    """Learning goal including concept outline when present."""
    if isinstance(sub, dict):
        g = str(sub.get("learning_goal") or "").strip()
        if g:
            return g
        name = subtopic_name(sub)
        concepts = sub.get("concepts") or []
        if name and concepts:
            bullets = "\n".join(f"• {c}" for c in concepts)
            return f"Build a clear foundation in {name}.\n\nCover these ideas:\n{bullets}"
        if name:
            return f"Build a clear foundation in {name}."
        return ""
    name = subtopic_name(sub)
    return f"Build a clear foundation in {name}." if name else ""


def skill_dicts() -> List[Dict[str, Any]]:
    out = []
    for row in SKILLS:
        (slug, name, short, domain, description, codes, sort, p_init, transit, slip, guess) = row
        out.append(
            {
                "slug": slug,
                "name": name,
                "short_label": short,
                "domain": domain,
                "description": description,
                "standard_codes": codes,
                "sort_order": sort,
                "p_init": p_init,
                "p_transit": transit,
                "p_slip": slip,
                "p_guess": guess,
            }
        )
    return out


def export_frontend_payload() -> Dict[str, Any]:
    """JSON shape for frontend/src/services/learning/cs_pilot_data.json."""
    prereq_map: Dict[str, List[Dict[str, str]]] = {s[0]: [] for s in SKILLS}
    for skill_slug, pre_slug, strength in PREREQS:
        if skill_slug in prereq_map:
            prereq_map[skill_slug].append({"slug": pre_slug, "strength": strength})
    skills_out = []
    for data in skill_dicts():
        skills_out.append(
            {
                "slug": data["slug"],
                "name": data["name"],
                "shortLabel": data["short_label"],
                "domain": data["domain"],
                "description": data["description"],
                "standardCodes": data["standard_codes"],
                "standardFramework": PILOT_STANDARD_FRAMEWORK,
                "pInit": data["p_init"],
                "pTransit": data["p_transit"],
                "pSlip": data["p_slip"],
                "pGuess": data["p_guess"],
                "prereqs": prereq_map.get(data["slug"], []),
            }
        )
    topics_out: Dict[str, List[Dict[str, Any]]] = {}
    for topic_name, rows in TOPIC_SKILLS.items():
        topics_out[topic_name] = [
            {"slug": slug, "weight": weight, "primary": primary}
            for slug, weight, primary in rows
        ]
    units_out = []
    for unit in PILOT_UNITS:
        subs = []
        for sub in unit.get("subtopics") or []:
            if isinstance(sub, dict):
                subs.append(
                    {
                        "name": sub.get("name"),
                        "code": sub.get("code"),
                        "skill": sub.get("skill"),
                        "learningGoal": sub.get("learning_goal"),
                        "concepts": list(sub.get("concepts") or []),
                    }
                )
            else:
                subs.append({"name": str(sub)})
        units_out.append(
            {
                "name": unit["name"],
                "layer": unit.get("layer"),
                "learningGoal": unit.get("learning_goal"),
                "subtopics": subs,
            }
        )
    return {
        "PILOT_SUBJECT": PILOT_SUBJECT,
        "standardFramework": PILOT_STANDARD_FRAMEWORK,
        "standardCrosswalk": pilot_standard_crosswalk(),
        "skills": skills_out,
        "topics": topics_out,
        "units": units_out,
        "topicOrder": list(PILOT_TOPIC_ORDER),
    }

