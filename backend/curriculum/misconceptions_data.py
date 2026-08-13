"""
Pilot misconception catalog + remediation playbooks (Epic B5).
"""

from __future__ import annotations

from typing import Any, Dict, List

# patterns: list of case-insensitive regex strings matched against student+tutor text
MISCONCEPTIONS: List[Dict[str, Any]] = [
    {
        "slug": "adds_denominators",
        "label": "Adding denominators",
        "domain": "fractions",
        "description": "Student adds bottoms when adding fractions (e.g. 1/4+1/4 → 2/8).",
        "skill_slug": "frac.add_like",
        "topic_names": ["Adding fractions", "Fraction sense"],
        "patterns": [
            r"\badd(ing|ed)? the denominators\b",
            r"\badd(ing|ed)? (the )?bottoms?\b",
            r"\b\d+/\d+\s*\+\s*\d+/\d+\s*=\s*\d+/\d+\b",  # soft: checked in engine with structure
            r"\b(keep|add).{0,12}bottom.{0,12}add.{0,12}top\b",
        ],
        "student_cues": [
            r"\badd(ing|ed)? the denominators\b",
            r"\badd(ing|ed)? (the )?bottoms?\b",
            r"\b(so )?(i )?add(ed)? (both|the )?(tops? and bottoms?|numerators? and denominators?)\b",
        ],
        "playbook": {
            "open": "Warmly normalize — lots of people try adding both numbers. We'll check what 'same-size pieces' means.",
            "steps": [
                "Draw or show two bars with the same denominator (same-size pieces).",
                "Shade the parts being added; count shaded parts for the new numerator.",
                "Keep the piece-size (denominator) the same when pieces already match.",
                "Contrast gently: adding bottoms would change the piece size, which changes the meaning.",
            ],
            "check_question": "If you have 1/6 + 2/6, are the pieces already the same size? What stays the same?",
            "tutor_directives": [
                "Misconception active: adding denominators — use same-size pieces language; never shame.",
                "Prefer a like-denominator visual before symbols.",
            ],
            "success_signal": "Student keeps denominator when adding like fractions, or explains piece size stays the same.",
        },
        "related_example_slug": "we.frac.add_like_pizza",
        "related_counter_slug": "we.frac.add_like_den_counter",
        "sort_order": 10,
    },
    {
        "slug": "bigger_bottom_bigger",
        "label": "Larger denominator = larger fraction",
        "domain": "fractions",
        "description": "Believes a bigger bottom number makes a bigger fraction (1/8 > 1/2).",
        "skill_slug": "frac.compare",
        "topic_names": ["Comparing fractions", "Fraction sense"],
        "patterns": [
            r"\bbigger (bottom|denominator).{0,24}(bigger|larger) fraction\b",
            r"\b(8|eight).{0,10}(bigger|larger|more).{0,10}(2|two|half)\b",
            r"\bbigger number on the bottom\b",
            r"\bmore pieces means (bigger|more)\b",
        ],
        "student_cues": [
            r"\bbigger (bottom|denominator).{0,24}(bigger|larger)\b",
            r"\b(because )?\d+ is (bigger|larger) than \d+\b.*\b(fraction|bottom|denominator)\b",
            r"\bmore pieces (is|are|=) (bigger|more|larger)\b",
        ],
        "playbook": {
            "open": "Great noticing of the numbers — let's check what 'more pieces' does to the size of each piece.",
            "steps": [
                "Compare unit fractions with a shared whole (bar or pizza).",
                "Show 1/2 vs 1/8: same whole, more equal cuts → each piece is smaller.",
                "Say the rule in kid language: for unit fractions, bigger bottom → smaller bite.",
                "Invite them to place both on a number line or bar.",
            ],
            "check_question": "Which is a bigger piece of the same pizza: 1/2 or 1/8? Why?",
            "tutor_directives": [
                "Misconception active: bigger denominator ≠ bigger fraction for unit fractions.",
                "Use concrete equal-whole models; avoid abstract cross-multiply first.",
            ],
            "success_signal": "Student correctly orders unit fractions or explains smaller pieces.",
        },
        "related_example_slug": "we.frac.compare_same_den",
        "related_counter_slug": "we.frac.compare_bigger_bottom_counter",
        "sort_order": 20,
    },
    {
        "slug": "confuses_multiply_divide",
        "label": "Multiply/divide confusion",
        "domain": "early_algebra",
        "description": "Uses multiply when undoing multiply (or vice versa) in one-step equations.",
        "skill_slug": "alg.one_step_equation",
        "topic_names": ["Simple equations", "Variables & unknowns"],
        "patterns": [
            r"\b(multiply|times).{0,20}(when|instead).{0,15}divid",
            r"\bdivid.{0,20}(when|instead).{0,15}(multiply|times)",
            r"\bundo (multiply|times) by (multiply|times)\b",
            r"\bundo (divid|÷) by (divid|÷)\b",
        ],
        "student_cues": [
            r"\b(multiply|times).{0,20}(both sides|to get|to undo)\b",
            r"\bi (multiplied|times) both sides\b",
            r"\bundo .{0,10} by (multiplying|times)\b",
        ],
        "playbook": {
            "open": "You're thinking about undoing — perfect. Let's match the undo move to what was done.",
            "steps": [
                "Name the operation on x (e.g. 3x means ×3).",
                "Name the inverse (÷3) and do it on both sides of the balance.",
                "Check by plugging the answer back in.",
                "Contrast: multiplying again would make it heavier, not undo.",
            ],
            "check_question": "If someone did ×3 to x, what one move undoes that on both sides?",
            "tutor_directives": [
                "Misconception active: multiply/divide inverse mix-up — use balance language.",
                "Always end with a substitution check.",
            ],
            "success_signal": "Student picks the inverse operation and verifies.",
        },
        "related_example_slug": "we.alg.one_step_multiply",
        "related_counter_slug": None,
        "sort_order": 30,
    },
    {
        "slug": "treats_fraction_as_two_numbers",
        "label": "Fraction as two separate numbers",
        "domain": "fractions",
        "description": "Treats num and den as unrelated whole numbers, not parts of one amount.",
        "skill_slug": "frac.numerator_denominator",
        "topic_names": ["Fraction sense", "Fractions on a number line"],
        "patterns": [
            r"\b(top|numerator).{0,20}(doesn'?t|does not).{0,20}(connect|relate|link).{0,20}(bottom|denominator)\b",
            r"\btwo (different|separate) numbers\b",
            r"\bjust the top number\b",
        ],
        "student_cues": [
            r"\btwo (different|separate) numbers\b",
            r"\bonly (the )?(top|numerator) matters\b",
            r"\bbottom (is|means) (just )?how many (lines|marks)\b",
        ],
        "playbook": {
            "open": "Nice start looking at the numbers — a fraction is one idea with two jobs.",
            "steps": [
                "Bottom = how many equal parts make the whole.",
                "Top = how many of those parts we have.",
                "Show 3/4 as three shaded fourths of one bar.",
                "Ask them to say it as a sentence: '3 out of 4 equal parts'.",
            ],
            "check_question": "In 2/5, what does the 5 tell us about the pieces?",
            "tutor_directives": [
                "Misconception: fraction as two loose numbers — always pair num/den as one amount.",
            ],
            "success_signal": "Student describes fraction as parts of one whole.",
        },
        "related_example_slug": "we.frac.num_den_bar",
        "related_counter_slug": "we.frac.num_den_swap_counter",
        "sort_order": 40,
    },
    {
        "slug": "equivalence_by_adding",
        "label": "Equivalence by adding to top and bottom",
        "domain": "fractions",
        "description": "Thinks adding the same number to num and den keeps the value (1/2 = 2/3).",
        "skill_slug": "frac.equivalent",
        "topic_names": ["Equivalent fractions"],
        "patterns": [
            r"\badd(ing|ed)? (the )?same (number|amount) to (the )?(top and bottom|numerator and denominator)\b",
            r"\b1/2\s*=\s*2/3\b",
            r"\bequivalent.{0,20}add\b",
        ],
        "student_cues": [
            r"\badd(ing|ed)? .{0,10}(to )?(both|top and bottom)\b",
            r"\bplus \d+ (on )?(top and bottom|both)\b",
        ],
        "playbook": {
            "open": "You're looking for a fair change — yes. The fair move is multiply/divide, not add.",
            "steps": [
                "Show 1/2 bar vs 2/3 bar: different shaded amounts.",
                "Show 1/2 → 2/4 by splitting each half (multiply by 2/2).",
                "Name the rule: multiply or divide top and bottom by the same nonzero number.",
                "Optional: contrast add-1 path as a friendly counterexample.",
            ],
            "check_question": "Does adding 1 to top and bottom of 1/2 keep the same amount of pizza?",
            "tutor_directives": [
                "Misconception: equivalence-by-adding — prefer split-the-pieces visuals.",
            ],
            "success_signal": "Student generates an equivalent by ×/÷ same factor.",
        },
        "related_example_slug": "we.frac.equiv_double",
        "related_counter_slug": "we.frac.equiv_add_counter",
        "sort_order": 50,
    },
    {
        "slug": "unequal_parts_as_fraction",
        "label": "Unequal parts called equal fractions",
        "domain": "fractions",
        "description": "Names pieces as fractions even when parts are not equal.",
        "skill_slug": "frac.parts_of_whole",
        "topic_names": ["Fraction sense"],
        "patterns": [
            r"\b(unequal|different size).{0,20}(still )?(half|third|fraction)\b",
            r"\bdoesn'?t (have to|need to) be equal\b",
            r"\bany (two|three) pieces\b",
        ],
        "student_cues": [
            r"\bdoesn'?t (have to|need to) be equal\b",
            r"\bun(equal|even) (pieces|parts).{0,15}(half|fraction)\b",
            r"\bclose enough (to )?(half|equal)\b",
        ],
        "playbook": {
            "open": "You're thinking about parts of a whole — the key word is equal parts.",
            "steps": [
                "Show a fair half (equal) vs an unfair split.",
                "Only equal parts earn fraction names like 1/2, 1/4.",
                "Have them rebuild a fair split with a bar or fold.",
            ],
            "check_question": "If two pieces aren't the same size, can we call one of them 1/2? Why?",
            "tutor_directives": [
                "Misconception: unequal parts as fractions — emphasize equal shares first.",
            ],
            "success_signal": "Student requires equal parts before naming unit fractions.",
        },
        "related_example_slug": "we.frac.parts_pizza",
        "related_counter_slug": None,
        "sort_order": 60,
    },
    {
        "slug": "variable_is_label",
        "label": "Variable as a word label",
        "domain": "early_algebra",
        "description": "Thinks a letter stands for an object name, not an unknown number.",
        "skill_slug": "alg.variable_as_unknown",
        "topic_names": ["Variables & unknowns", "Simple equations"],
        "patterns": [
            r"\b(m|x) (means|stands for) (the )?(word|name|marbles? word)\b",
            r"\bletter (is|means) (the )?object\b",
            r"\bnot a number\b.*\b(letter|variable)\b",
        ],
        "student_cues": [
            r"\b(letter|variable) (is|means) (the )?(name|word|thing)\b",
            r"\bm (is|=) marbles\b",
            r"\bx (is|=) apples\b",
        ],
        "playbook": {
            "open": "Letters are shortcuts for amounts we don't know yet — like a mystery number bag.",
            "steps": [
                "Replace the letter with 'some number of …'.",
                "Write a tiny story: bag has m marbles; add 3 → m+3.",
                "When we learn the number, the letter becomes that number.",
            ],
            "check_question": "If m = 7 marbles, what does m + 3 mean in numbers?",
            "tutor_directives": [
                "Misconception: variable-as-label — keep 'unknown number' language.",
            ],
            "success_signal": "Student treats the letter as a stand-in number.",
        },
        "related_example_slug": "we.alg.variable_bag",
        "related_counter_slug": None,
        "sort_order": 70,
    },
    {
        "slug": "one_side_balance",
        "label": "Changing only one side of an equation",
        "domain": "early_algebra",
        "description": "Undoes an operation on one side only, breaking equality.",
        "skill_slug": "alg.balance_idea",
        "topic_names": ["Simple equations", "Variables & unknowns"],
        "patterns": [
            r"\bonly (on )?(the )?(left|right) side\b",
            r"\b(don'?t|do not) (need to )?change (the )?other side\b",
            r"\bjust (subtract|add|divide|multiply) (on )?(one side|the left|the right)\b",
        ],
        "student_cues": [
            r"\bonly (on )?(the )?(left|right)\b",
            r"\bother side (stays|can stay)\b",
            r"\bjust (fix|change) one side\b",
        ],
        "playbook": {
            "open": "Balance scale thinking helps — both sides have to stay fair.",
            "steps": [
                "Picture a scale: left total equals right total.",
                "Any move (add/subtract/×/÷) must happen on both sides.",
                "Demo tipping the scale by changing only one side.",
                "Re-balance with a matched move.",
            ],
            "check_question": "If you subtract 3 from the left, what must you do on the right to stay balanced?",
            "tutor_directives": [
                "Misconception: one-side changes — use physical/balance metaphors.",
            ],
            "success_signal": "Student applies the same undo to both sides.",
        },
        "related_example_slug": "we.alg.balance_scale",
        "related_counter_slug": None,
        "sort_order": 80,
    },
]
