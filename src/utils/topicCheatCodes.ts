import type { SubjectTag, TestPaper } from '../types/index.ts';
import type { StudyPlanDay } from '../types/aiSystem.ts';

export interface TopicFormulaItem {
  name: string;
  formula: string;
  explanation: string;
}

export interface TopicCheatCodeItem {
  title: string;
  shortcut: string;
  explanation: string;
}

export interface TopicSlideDeck {
  topicKey: string;
  topicTitle: string;
  subject: SubjectTag;
  examFocusLabel: string;
  summary: string;
  formulas: TopicFormulaItem[];
  cheatCodes: TopicCheatCodeItem[];
  workedExample: {
    problem: string;
    standardApproach: string;
    cheatCodeApproach: string;
    finalAnswer: string;
  };
  commonTraps: string[];
  speedTargetNote: string;
}

interface TopicDeckSeed {
  id: string;
  keywords: string[];
  subject: SubjectTag;
  deck: Omit<TopicSlideDeck, 'topicKey' | 'topicTitle' | 'subject'>;
}

const TOPIC_DECK_SEEDS: TopicDeckSeed[] = [
  // --- QUANTITATIVE APTITUDE ---
  {
    id: 'quant_number_system',
    keywords: ['number system', 'divisibility', 'unit digit', 'remainder', 'hcf', 'lcm', 'types of numbers', 'number properties', 'number problems'],
    subject: 'Quantitative Aptitude',
    deck: {
      examFocusLabel: 'SSC · TCS NQT · Infosys · RRB',
      summary: 'High-frequency arithmetic foundation testing divisibility shortcuts, power cyclicity, and modular remainders under 10 seconds.',
      formulas: [
        {
          name: 'HCF & LCM Product Identity',
          formula: '$\\text{HCF}(a,b) \\times \\text{LCM}(a,b) = a \\times b$',
          explanation: 'For any two positive integers, the product of their HCF and LCM equals the product of the numbers. Useful for instant cross-checking.',
        },
        {
          name: 'Division Algorithm & Remainder',
          formula: '$N = D \\times Q + R, \\quad 0 \\le R < D$',
          explanation: 'Break large powers using modular equivalence: $(a \\cdot b) \\bmod D = ((a \\bmod D)(b \\bmod D)) \\bmod D$.',
        },
        {
          name: 'Unit Digit Cyclicity',
          formula: '$d^n \\equiv d^{((n-1) \\bmod 4) + 1} \\pmod{10}$',
          explanation: 'Digits 2, 3, 7, 8 repeat every 4 powers; 4 and 9 repeat every 2 powers; 0, 1, 5, 6 never change their unit digit.',
        },
      ],
      cheatCodes: [
        {
          title: 'Alternating Sum Rule for 11 & 7/13 Chunking',
          shortcut: '$|\\text{Sum}(\\text{Odd Pos}) - \\text{Sum}(\\text{Even Pos})| \\in \\{0, 11, 22, \\dots\\}$',
          explanation: 'Check divisibility by 11 in 3 seconds without dividing. For 7, 11, or 13 on 6-digit numbers, subtract the last 3 digits from the first 3 digits.',
        },
        {
          title: 'Negative Remainder Trick',
          shortcut: '$17^{200} \\bmod 18 \\equiv (-1)^{200} = +1$',
          explanation: 'Whenever the base is 1 less than the divisor, replace the base with $-1$. Even powers yield $1$, odd powers yield $D - 1$.',
        },
        {
          title: 'Digital Root Cross-Check',
          shortcut: '$\\text{DR}(a \\times b) = \\text{DR}(\\text{DR}(a) \\times \\text{DR}(b))$',
          explanation: 'Sum the digits repeatedly to a single digit (casting out 9s). Eliminate any MCQ option whose digital root mismatches.',
        },
      ],
      workedExample: {
        problem: 'Find the unit digit of $7^{95} - 3^{58}$.',
        standardApproach: 'Divide 95 by 4 (remainder 3 -> $7^3$ ends in 3). Divide 58 by 4 (remainder 2 -> $3^2$ ends in 9). Borrow 10: $13 - 9 = 4$.',
        cheatCodeApproach: 'Cycle mod 4 on exponents: $95 \\bmod 4 = 3 \\implies 7^3 \\to 3$; $58 \\bmod 4 = 2 \\implies 3^2 \\to 9$. Think $13 - 9 = 4$ instantly.',
        finalAnswer: '4',
      },
      commonTraps: [
        'When remainder of exponent $\\div 4$ is $0$, use power $4$ (not $0$), e.g., $2^4 \\to 6$.',
        'Never subtract unit digits negatively ($3 - 9 = -6$); always borrow $10$ first ($13 - 9 = 4$).',
      ],
      speedTargetNote: 'Target <= 6 seconds using exponent mod-4 cyclicity.',
    },
  },
  {
    id: 'quant_percentages',
    keywords: ['percentage', 'fraction equivalent', 'successive percentage', 'population growth', 'depreciation', 'finance'],
    subject: 'Quantitative Aptitude',
    deck: {
      examFocusLabel: 'Corporate Aptitude · Banking · SSC CGL',
      summary: 'Core speed multiplier across DI, Profit-Loss, and SI/CI. Replacing percent multiplication with base fractions cuts time by 70%.',
      formulas: [
        {
          name: 'Successive Percentage Change',
          formula: '$\\text{Net \\%} = a + b + \\frac{ab}{100}$',
          explanation: 'Use positive signs for increases and negative signs for decreases across two consecutive percentage changes.',
        },
        {
          name: 'Price-Consumption Inverse Invariant',
          formula: '$\\text{If Price } \\uparrow \\frac{x}{y}, \\text{ Consumption } \\downarrow \\frac{x}{x+y}$',
          explanation: 'Keeps total expenditure constant without setting up algebra equations.',
        },
        {
          name: 'Percentage Change Base Formula',
          formula: '$\\text{\\% Change} = \\frac{\\text{New} - \\text{Original}}{\\text{Original}} \\times 100$',
          explanation: 'Always divide by the initial baseline value, never the final value.',
        },
      ],
      cheatCodes: [
        {
          title: 'High-Speed Fraction Table ($1/6$ to $1/16$)',
          shortcut: '$16\\frac{2}{3}\\% = \\frac{1}{6},\\; 14\\frac{2}{7}\\% = \\frac{1}{7},\\; 12.5\\% = \\frac{1}{8},\\; 11\\frac{1}{9}\\% = \\frac{1}{9},\\; 6.25\\% = \\frac{1}{16}$',
          explanation: 'Memorize denominator complements: if $14.28\\%$ is $+1/7$, multiplying by $8/7$ takes 2 seconds instead of $\\times 1.1428$.',
        },
        {
          title: 'AB-Rule Flip ($+25\\% \\leftrightarrow -20\\%$)',
          shortcut: '$+\\frac{1}{n} \\iff -\\frac{1}{n+1}$',
          explanation: 'If A is $25\\%$ ($+1/4$) more than B, B is $1/(4+1) = 20\\%$ less than A. Instant 2-second answer on comparison questions.',
        },
        {
          title: 'Commutative Trick ($x\\% \\text{ of } y = y\\% \\text{ of } x$)',
          shortcut: '$32\\% \\text{ of } 25 = 25\\% \\text{ of } 32 = \\frac{32}{4} = 8$',
          explanation: 'Swap percentage and base whenever the base is an easy fraction like 25, 50, 20, or 12.5.',
        },
      ],
      workedExample: {
        problem: 'Sugar price rises by $25\\%$. By what percent must a family cut consumption to keep spending unchanged?',
        standardApproach: 'Let old price = 100, qty = 100 (spend 10,000). New price = 125 -> qty = $10000/125 = 80$ -> reduction = $20\\%$.',
        cheatCodeApproach: 'Apply AB-Rule: $+25\\% = +1/4 \\implies \\text{cut} = 1/(4+1) = 1/5 = 20\\%$. Zero scratchpad needed.',
        finalAnswer: '20%',
      },
      commonTraps: [
        'Applying $+20\\%$ then $-20\\%$ does NOT return to $0\\%$; net change is $20 - 20 - 4 = -4\\%$.',
        'Confusing "more than" base with "less than" base during comparisons.',
      ],
      speedTargetNote: 'Target <= 5 seconds via fraction conversion and AB-rule.',
    },
  },
  {
    id: 'quant_profit_loss',
    keywords: ['profit', 'loss', 'discount', 'marked price', 'cost price', 'dishonest', 'faulty weights'],
    subject: 'Quantitative Aptitude',
    deck: {
      examFocusLabel: 'TCS · Deloitte · SSC · Bank PO',
      summary: 'Links Cost Price (CP), Selling Price (SP), and Marked Price (MP) directly through clean ratio bridges.',
      formulas: [
        {
          name: 'CP-to-MP Direct Ratio Bridge',
          formula: '$\\frac{\\text{CP}}{\\text{MP}} = \\frac{100 - D\\%}{100 + P\\%}$',
          explanation: 'Relates cost price and marked price in one line given discount $D\\%$ and profit $P\\%$.',
        },
        {
          name: 'Equivalent Single Discount',
          formula: '$D_{\\text{eq}} = d_1 + d_2 - \\frac{d_1 d_2}{100}$',
          explanation: 'Always strictly less than the plain sum $d_1 + d_2$ of successive discounts.',
        },
        {
          name: 'Same SP, Equal Gain & Loss %',
          formula: '$\\text{Net Loss \\%} = \\left(\\frac{x}{10}\\right)^2\\%$',
          explanation: 'When two items sell at the same SP, one at $+x\\%$ gain and one at $-x\\%$ loss, there is ALWAYS an overall loss.',
        },
      ],
      cheatCodes: [
        {
          title: 'Faulty Weight Ratio Flip',
          shortcut: '$\\text{Gain \\%} = \\frac{\\text{True Wt} - \\text{False Wt}}{\\text{False Wt}} \\times 100$',
          explanation: 'Selling 800g as 1kg gives $(1000 - 800)/800 = 25\\%$ profit (divide by FALSE weight given, not 1000g).',
        },
        {
          title: 'Article Swap Trick ($x \\text{ CP} = y \\text{ SP}$)',
          shortcut: '$\\text{Profit/Loss \\%} = \\frac{x - y}{y} \\times 100$',
          explanation: 'Simply swap coefficients: if CP of 12 pens = SP of 10 pens, profit is $(12 - 10)/10 = 20\\%$.',
        },
      ],
      workedExample: {
        problem: 'A shopkeeper allows $20\\%$ discount on MP and still makes $20\\%$ profit. Find the ratio CP : MP.',
        standardApproach: 'Let CP = 100 -> SP = 120. Since $0.80 \\times \\text{MP} = 120$, $\\text{MP} = 150$. Ratio = $100:150 = 2:3$.',
        cheatCodeApproach: 'Direct bridge: $\\text{CP}/\\text{MP} = (100 - 20)/(100 + 20) = 80/120 = 2:3$. Solved in 3 seconds.',
        finalAnswer: '2 : 3',
      },
      commonTraps: [
        'Calculating profit/loss percentage on SP instead of CP unless explicitly stated.',
        'Dividing faulty-balance gain by 1000g instead of actual weight delivered.',
      ],
      speedTargetNote: 'Target <= 6 seconds using CP/MP bridge and swap rule.',
    },
  },
  {
    id: 'quant_ratio_partnership',
    keywords: ['ratio', 'proportion', 'partnership', 'ages', 'age '],
    subject: 'Quantitative Aptitude',
    deck: {
      examFocusLabel: 'Accenture · Infosys · SSC · RRB',
      summary: 'Combines multi-part ratios and time-weighted investment sharing without algebraic variables.',
      formulas: [
        {
          name: 'Partnership Profit Ratio',
          formula: '$\\text{Profit}_A : \\text{Profit}_B = (I_A \\times T_A) : (I_B \\times T_B)$',
          explanation: 'Profit is shared strictly in the ratio of capital invested multiplied by active duration.',
        },
        {
          name: 'Mean, Third & Fourth Proportional',
          formula: '$\\text{Mean}(a,b)=\\sqrt{ab},\\quad \\text{Third}(a,b)=\\frac{b^2}{a},\\quad \\text{Fourth}(a,b,c)=\\frac{bc}{a}$',
          explanation: 'Memorize exact denominators so proportional questions solve mentally in 4 seconds.',
        },
      ],
      cheatCodes: [
        {
          title: 'Z-Method Ratio Merge ($A:B$ & $B:C$)',
          shortcut: '$A:B:C = (a_1 b_2) : (b_1 b_2) : (b_1 c_2)$',
          explanation: 'Write $a_1:b_1$ over $b_2:c_2$, multiply down-left, middle column, and down-right to merge ratios in one stroke.',
        },
        {
          title: 'Option Divisibility Filter',
          shortcut: '$\\text{If target} = k \\text{ parts}, \\; \\text{answer must divide cleanly by } k$',
          explanation: 'In integer age or share problems, immediately check which MCQ option is divisible by the required ratio sum or part.',
        },
      ],
      workedExample: {
        problem: 'If $A:B = 3:4$ and $B:C = 6:5$, find $A:B:C$.',
        standardApproach: 'Equalize B to LCM(4,6)=12: $A:B = 9:12$, $B:C = 12:10 \\implies 9:12:10$.',
        cheatCodeApproach: 'Z-multiply $(3\\times 6):(4\\times 6):(4\\times 5) = 18:24:20$, divide by 2 -> $9:12:10$.',
        finalAnswer: '9 : 12 : 10',
      },
      commonTraps: [
        'Forgetting that age differences remain constant across all years ($A - B$ never changes).',
        'Ignoring mid-year capital withdrawals in partnership months.',
      ],
      speedTargetNote: 'Target <= 5 seconds via option divisibility and Z-merge.',
    },
  },
  {
    id: 'quant_si_ci',
    keywords: ['simple & compound interest', 'compound interest', 'simple interest', 'installment', 'si ', 'ci ', 'compounding', 'equal interest', 'loan', 'rate/time/principal'],
    subject: 'Quantitative Aptitude',
    deck: {
      examFocusLabel: 'Banking PO · SSC · Corporate Quant',
      summary: 'Eliminates messy $(1 + r/100)^n$ powers using effective rate formulas and 2-year/3-year difference shortcuts.',
      formulas: [
        {
          name: '2-Year CI − SI Difference',
          formula: '$\\text{CI}_2 - \\text{SI}_2 = P \\left(\\frac{R}{100}\\right)^2$',
          explanation: 'Exact interest-on-interest earned during Year 2.',
        },
        {
          name: '3-Year CI − SI Difference',
          formula: '$\\text{CI}_3 - \\text{SI}_3 = P \\left(\\frac{R}{100}\\right)^2 \\left(3 + \\frac{R}{100}\\right)$',
          explanation: 'Fastest way to recover Principal $P$ or Rate $R$ from a 3-year difference.',
        },
        {
          name: 'Effective 2-Year Compound Rate',
          formula: '$R_{\\text{eff}} = 2R + \\frac{R^2}{100}\\%$',
          explanation: 'Turns 2-year CI directly into a single percentage of Principal $P$.',
        },
      ],
      cheatCodes: [
        {
          title: 'Rule of Compound Powers (Doubling Time)',
          shortcut: '$A = P \\cdot k^t \\implies \\text{Every fixed } T \\text{ years multiplies amount by } k$',
          explanation: 'If money triples ($\\times 3$) in 4 years at CI, it becomes $3^2 = 9\\times$ in $2 \\times 4 = 8$ years and $3^3 = 27\\times$ in 12 years.',
        },
        {
          title: 'Half-Yearly / Quarterly Scale Trick',
          shortcut: '$\\text{Half-yearly: } R \\to R/2,\\; T \\to 2T; \\quad \\text{Quarterly: } R \\to R/4,\\; T \\to 4T$',
          explanation: 'Convert rate and periods before applying the effective 2-period formula $2r + r^2/100$.',
        },
      ],
      workedExample: {
        problem: 'Difference between CI and SI on Rs. 5,000 for 2 years at $10\\%$ p.a. is:',
        standardApproach: 'CI = $5000(1.1^2 - 1) = 1050$; SI = $5000 \\times 20\\% = 1000$; diff = $50$.',
        cheatCodeApproach: 'Formula shortcut: $P(R/100)^2 = 5000 \\times (0.1)^2 = 5000 \\times 0.01 = 50$.',
        finalAnswer: '50',
      },
      commonTraps: [
        'Confusing CI doubling rule (geometric multiplication) with SI doubling rule (linear interest steps: $(n-1)$ pattern).',
        'Forgetting to halve $R$ when compounding semi-annually.',
      ],
      speedTargetNote: 'Target <= 6 seconds using $P(R/100)^2$ and power scaling.',
    },
  },
  {
    id: 'quant_time_work',
    keywords: ['time, work', 'work', 'pipe', 'cisterns', 'efficiency', 'workdays', 'wages', 'leakage', 'alternate opening'],
    subject: 'Quantitative Aptitude',
    deck: {
      examFocusLabel: 'TCS · Wipro · Capgemini · SSC',
      summary: 'Converts fractions ($1/A + 1/B$) into integer LCM work units so addition takes 3 seconds.',
      formulas: [
        {
          name: 'MDH Chain Rule',
          formula: '$\\frac{M_1 D_1 H_1 E_1}{W_1} = \\frac{M_2 D_2 H_2 E_2}{W_2}$',
          explanation: 'Men $\\times$ Days $\\times$ Hours $\\times$ Efficiency divided by Work stays invariant across two crew scenarios.',
        },
        {
          name: 'Combined Completion Time',
          formula: '$T_{A+B} = \\frac{ab}{a+b}, \\qquad T_{\\text{leak}} = \\frac{ab}{b-a}$',
          explanation: 'Two-worker shortcut avoids LCM setup completely on pair questions.',
        },
      ],
      cheatCodes: [
        {
          title: 'LCM Unit Box Method (Zero Fractions)',
          shortcut: '$\\text{Total Work} = \\text{LCM}(\\text{Days}),\\quad \\text{Rate} = \\frac{\\text{Total Work}}{\\text{Days}}$',
          explanation: 'Treat leak pipes as negative rates. Add/subtract integer units per day to solve multi-worker leaves or alternate-day cycles.',
        },
        {
          title: 'Geometric Mean Shortcut ($\\sqrt{ab}$)',
          shortcut: '$\\text{If A takes } a \\text{ extra days and B takes } b \\text{ extra days than } (A+B): \\; T_{A+B} = \\sqrt{ab}$',
          explanation: 'Instant 2-second solution to the classic "A takes $a$ days more than $A+B$, B takes $b$ days more" exam staple.',
        },
      ],
      workedExample: {
        problem: 'A finishes a job in 12 days and B in 15 days. Working together, how many days will they take?',
        standardApproach: 'LCM(12,15) = 60 units. A = 5/day, B = 4/day -> Total = 9/day -> $60/9 = 6\\frac{2}{3}$ days.',
        cheatCodeApproach: 'Pair formula: $(12 \\times 15)/(12 + 15) = 180/27 = 20/3 = 6\\frac{2}{3}$ days.',
        finalAnswer: '6 2/3 days',
      },
      commonTraps: [
        'In alternate-day problems, compute 2-day cycles up to just below Total Work, then finish the final remainder turn-by-turn.',
        'Wages always split in the ratio of WORK DONE, not days worked (unless all worked equally).',
      ],
      speedTargetNote: 'Target <= 6 seconds via $ab/(a+b)$ and $\\sqrt{ab}$ shortcuts.',
    },
  },
  {
    id: 'quant_tsd_trains_boats',
    keywords: ['time, speed', 'tsd', 'distance', 'train', 'boat', 'stream', 'relative speed', 'circular'],
    subject: 'Quantitative Aptitude',
    deck: {
      examFocusLabel: 'Infosys · Cognizant · SSC · RRB',
      summary: 'Master unit conversions, relative speed, and harmonic average speeds cleanly under pressure.',
      formulas: [
        {
          name: 'Equal-Distance Average Speed',
          formula: '$v_{\\text{avg}} = \\frac{2v_1 v_2}{v_1 + v_2}$',
          explanation: 'Never take the arithmetic mean $(v_1 + v_2)/2$ over equal distances; always use the harmonic mean.',
        },
        {
          name: 'Boats & Streams Identities',
          formula: '$D = B + S,\\quad U = B - S \\implies B = \\frac{D+U}{2},\\; S = \\frac{D-U}{2}$',
          explanation: 'Recover still-water boat speed $B$ and stream speed $S$ from downstream $D$ and upstream $U$ speeds in 2 seconds.',
        },
        {
          name: 'Train Crossing Length',
          formula: '$t = \\frac{L_1 + L_2}{v_{\\text{rel}}}$',
          explanation: 'Add speeds for opposite directions, subtract speeds for same direction. Pole/person has $L_2 = 0$.',
        },
      ],
      cheatCodes: [
        {
          title: 'Instant Unit Factor ($5/18$ Rule)',
          shortcut: '$18\\text{ km/h} = 5\\text{ m/s},\\; 36 = 10,\\; 54 = 15,\\; 72 = 20,\\; 90 = 25,\\; 108 = 30$',
          explanation: 'Spot multiples of 18 immediately to convert km/h to m/s without even multiplying fractions.',
        },
        {
          title: 'Early/Late Arrival Distance Formula',
          shortcut: '$\\text{Dist} = \\frac{v_1 v_2}{|v_1 - v_2|} \\times \\Delta t_{\\text{hours}}$',
          explanation: 'If one speed makes you $t_1$ min late and another $t_2$ min early, add $\\Delta t = (t_1 + t_2)/60$ hours.',
        },
      ],
      workedExample: {
        problem: 'A 150m train runs at 72 km/h. How long does it take to cross a 250m bridge?',
        standardApproach: 'Speed = $72 \\times 5/18 = 20$ m/s. Distance = $150 + 250 = 400$ m. Time = $400/20 = 20$ s.',
        cheatCodeApproach: 'Spot 72 km/h = 20 m/s immediately. Total length $400 / 20 = 20$ seconds.',
        finalAnswer: '20 seconds',
      },
      commonTraps: [
        'Forgetting to add BOTH train lengths or train + platform length.',
        'Mixing minutes with hours when plugging $\\Delta t$ into distance formulas.',
      ],
      speedTargetNote: 'Target <= 6 seconds using 18-multiple m/s mapping.',
    },
  },
  {
    id: 'quant_average_mixtures',
    keywords: ['average', 'mixture', 'alligation', 'weighted'],
    subject: 'Quantitative Aptitude',
    deck: {
      examFocusLabel: 'Banking · CAT/MBA · SSC · Corporate',
      summary: 'Replaces multi-equation mixture algebra with the 3-second Cross-Alligation diagram and deviation balancing.',
      formulas: [
        {
          name: 'Cross-Alligation Ratio',
          formula: '$\\frac{Q_1}{Q_2} = \\frac{C_2 - C_{\\text{mean}}}{C_{\\text{mean}} - C_1}$',
          explanation: 'Place cheaper $C_1$ and dearer $C_2$ on top, mean $C_{\\text{mean}}$ in center, subtract diagonally.',
        },
        {
          name: 'Iterative Draw & Replace Formula',
          formula: '$\\text{Pure Left} = V \\left(1 - \\frac{x}{V}\\right)^n$',
          explanation: 'When $x$ litres of mixture is replaced with water $n$ times from volume $V$, apply remaining-fraction powers.',
        },
      ],
      cheatCodes: [
        {
          title: 'Zero-Sum Deviation Average Trick',
          shortcut: '$\\text{New Avg} = \\text{Old Avg} + \\frac{\\text{Replaced} - \\text{Removed}}{N}$',
          explanation: 'When one person/item replaces another, never recompute total sum—just divide the net difference by $N$.',
        },
        {
          title: 'Consecutive Series Median Rule',
          shortcut: '$\\text{Avg of arithmetic progression} = \\frac{\\text{First} + \\text{Last}}{2} = \\text{Middle Term}$',
          explanation: 'Works for consecutive integers, evens, odds, or multiples of $k$ instantly.',
        },
      ],
      workedExample: {
        problem: 'Average weight of 10 students increases by 1.5 kg when a 50 kg student is replaced by a new student. Find the new weight.',
        standardApproach: 'Sum increases by $10 \\times 1.5 = 15$ kg. New weight = $50 + 15 = 65$ kg.',
        cheatCodeApproach: 'Deviation shortcut: $\\text{New} = \\text{Old} + N \\cdot \\Delta \\text{Avg} = 50 + 10(1.5) = 65$ kg.',
        finalAnswer: '65 kg',
      },
      commonTraps: [
        'Inverting the ratio order in Cross-Alligation ($Q_1$ aligns with $|C_2 - C_{\\text{mean}}|$, NOT $|C_1 - C_{\\text{mean}}|$).',
        'Dividing by old $N$ instead of $N+1$ when a member joins rather than replaces.',
      ],
      speedTargetNote: 'Target <= 5 seconds via deviation balancing and cross-alligation.',
    },
  },
  {
    id: 'quant_algebra',
    keywords: ['algebra', 'quadratic', 'linear equation', 'reciprocal', 'identities'],
    subject: 'Quantitative Aptitude',
    deck: {
      examFocusLabel: 'SSC CGL Tier-1/2 · TCS Digital · GATE',
      summary: 'High-speed evaluation of symmetric powers $(x + 1/x)$ and instant value-putting elimination.',
      formulas: [
        {
          name: 'Reciprocal Power Ladder',
          formula: '$x + \\frac{1}{x} = k \\implies x^2 + \\frac{1}{x^2} = k^2 - 2,\\quad x^3 + \\frac{1}{x^3} = k^3 - 3k$',
          explanation: 'For minus sign $x - 1/x = k$, swap signs: $x^2 + 1/x^2 = k^2 + 2$ and $x^3 - 1/x^3 = k^3 + 3k$.',
        },
        {
          name: 'Symmetric Cubic Zero Condition',
          formula: '$a + b + c = 0 \\implies a^3 + b^3 + c^3 = 3abc$',
          explanation: 'Saves full cubic expansion in 90% of SSC/corporate algebraic simplification questions.',
        },
      ],
      cheatCodes: [
        {
          title: 'Degree Symmetry & Value-Putting ($x=1$ or $0$)',
          shortcut: '$\\text{Pick simplest valid } a,b,c \\text{ satisfying constraints (avoid } 0/0)$',
          explanation: 'When options are constants or symmetric expressions with fewer equations than variables, plug $x=1, y=1$ or $c=0$ to verify in 4 seconds.',
        },
        {
          title: 'Two-Special Values ($k = 2 \\implies x = 1$; $k = -2 \\implies x = -1$)',
          shortcut: '$x + \\frac{1}{x} = 2 \\implies x^n + \\frac{1}{x^n} = 2 \\text{ for ALL } n$',
          explanation: 'Similarly, $x + 1/x = 1 \\implies x^3 = -1$, and $x + 1/x = -1 \\implies x^3 = +1$.',
        },
      ],
      workedExample: {
        problem: 'If $x + \\frac{1}{x} = 5$, find $x^3 + \\frac{1}{x^3}$.',
        standardApproach: 'Cube both sides: $x^3 + 1/x^3 + 3(x + 1/x) = 125 \\implies 125 - 15 = 110$.',
        cheatCodeApproach: 'Instant ladder: $k^3 - 3k = 5^3 - 3(5) = 125 - 15 = 110$.',
        finalAnswer: '110',
      },
      commonTraps: [
        'Choosing values during value-putting that make an option denominator $0$ or make two MCQ options equal.',
        'Forgetting $k^2 + 2$ (plus, not minus) when starting from $x - 1/x = k$.',
      ],
      speedTargetNote: 'Target <= 5 seconds via $k^3 - 3k$ and value-putting.',
    },
  },
  {
    id: 'quant_geometry_mensuration',
    keywords: ['geometry', 'mensuration', 'triangle', 'circle', 'sphere', 'cylinder', 'cone', 'cuboid', 'lines & angles', 'pythagoras', 'quadrilateral', 'perimeter', '2d', '3d', 'shape analysis'],
    subject: 'Quantitative Aptitude',
    deck: {
      examFocusLabel: 'SSC CGL · RRB NTPC · Engineering Aptitude',
      summary: 'Exploits Pythagorean triplets, angle-chasing shortcuts, and $\\pi$-divisibility for 5-second mensuration.',
      formulas: [
        {
          name: 'Circle Chord & Secant Power',
          formula: '$PA \\times PB = PC \\times PD = PT^2$',
          explanation: 'Applies equally to intersecting chords inside a circle and external secants/tangents.',
        },
        {
          name: 'Heron & Equilateral Triangle Area',
          formula: '$A_{\\text{eq}} = \\frac{\\sqrt{3}}{4}a^2,\\quad h = \\frac{\\sqrt{3}}{2}a$',
          explanation: 'Inradius $r = a/(2\\sqrt{3})$ and circumradius $R = a/\\sqrt{3}$ ($R = 2r$).',
        },
        {
          name: '3D Volume Scaling Ratio',
          formula: '$\\text{If linear scale } = k,\\; \\text{Area } \\to k^2,\\; \\text{Volume } \\to k^3$',
          explanation: 'Doubling radius and height scales cylinder/cone volume by $2^3 = 8\\times$ instantly.',
        },
      ],
      cheatCodes: [
        {
          title: 'The 11-Divisibility $\\pi$-Filter',
          shortcut: '$\\pi = \\frac{22}{7} \\implies \\text{Circle/Cylinder/Cone/Sphere answers usually divide by } 11$',
          explanation: 'Since $22 = 2 \\times 11$, check which MCQ option’s alternating digit sum is divisible by $11$ whenever $\\pi = 22/7$ is used!',
        },
        {
          title: 'Standard Pythagorean Triplets',
          shortcut: '$(3,4,5),\\; (5,12,13),\\; (7,24,25),\\; (8,15,17),\\; (9,40,41),\\; (20,21,29)$',
          explanation: 'Spot any multiple (e.g., $6,8,10$ or $15,36,39$) to skip $\\sqrt{a^2+b^2}$ square roots completely.',
        },
      ],
      workedExample: {
        problem: 'Find the curved surface area of a cone with radius $7$ cm and height $24$ cm.',
        standardApproach: 'Slant height $l = \\sqrt{7^2 + 24^2} = 25$. CSA $= \\pi r l = (22/7)(7)(25) = 550\\text{ cm}^2$.',
        cheatCodeApproach: 'Spot $(7,24,25)$ triplet -> $l = 25$, cancel $7$ with $\\pi = 22/7$ -> $22 \\times 25 = 550$.',
        finalAnswer: '550 cm²',
      },
      commonTraps: [
        'Using vertical height $h$ instead of slant height $l$ in cone Curved Surface Area ($\\pi r l$).',
        'Adding only one circular base vs total surface area when a cylinder/hemisphere is solid ($3\\pi r^2$ for solid hemisphere).',
      ],
      speedTargetNote: 'Target <= 6 seconds using triplets and 11-divisibility.',
    },
  },
  {
    id: 'quant_trigonometry',
    keywords: ['trigonometry', 'heights', 'distances', 'angle of elevation', 'complementary angle', 'specific angle'],
    subject: 'Quantitative Aptitude',
    deck: {
      examFocusLabel: 'SSC · RRB · Technical Placements',
      summary: 'Converts messy trig expressions and shadow height problems into fixed 30-60-90 triangle ratios.',
      formulas: [
        {
          name: 'Complementary & Pythagorean Identities',
          formula: '$\\sec^2\\theta - \\tan^2\\theta = 1,\\quad \\csc^2\\theta - \\cot^2\\theta = 1$',
          explanation: 'Notice $\\sec\\theta + \\tan\\theta = p \\implies \\sec\\theta - \\tan\\theta = 1/p$ directly.',
        },
        {
          name: 'Special Height-Distance Ratios',
          formula: '$30^\\circ\\text{-}60^\\circ\\text{-}90^\\circ \\to 1:\\sqrt{3}:2,\\quad 45^\\circ\\text{-}45^\\circ\\text{-}90^\\circ \\to 1:1:\\sqrt{2}$',
          explanation: 'Side lengths follow exact fixed unit ratios without writing $\\tan\\theta$ equations.',
        },
      ],
      cheatCodes: [
        {
          title: 'Zero-Algebra $\\theta$-Substitution ($0^\\circ, 45^\\circ, 90^\\circ$)',
          shortcut: '$\\text{Put } \\theta = 45^\\circ \\text{ for } \\sin/\\cos/\\tan \\text{ (check no } 0/0 \\text{ denominator)}$',
          explanation: 'Turns algebraic trig simplification identities into a 4-second arithmetic check.',
        },
        {
          title: 'Twin-Angle Distance Formula ($30^\\circ \\to 60^\\circ$)',
          shortcut: '$\\text{Distance walked } d = h(\\cot\\alpha - \\cot\\beta); \\quad (30^\\circ \\to 60^\\circ: \\; h = \\frac{\\sqrt{3}}{2} d)$',
          explanation: 'Walking from $30^\\circ$ to $60^\\circ$ elevation means the remaining horizontal base to the tower is exactly half the distance walked!',
        },
      ],
      workedExample: {
        problem: 'If $\\sec\\theta + \\tan\\theta = 4$, find $\\sec\\theta$.',
        standardApproach: 'Write $\\sec\\theta - \\tan\\theta = 1/4$. Add equations: $2\\sec\\theta = 4 + 1/4 = 17/4 \\implies 17/8$.',
        cheatCodeApproach: 'Reciprocal shortcut: $(p + 1/p)/2 = (4 + 0.25)/2 = 17/8 = 2.125$.',
        finalAnswer: '17/8 (or 2.125)',
      },
      commonTraps: [
        'Substituting $\\theta = 0^\\circ$ or $90^\\circ$ when $\\tan, \\cot, \\sec, \\csc$ becomes undefined ($\\infty$).',
        'Mixing up $\\cot 30^\\circ = \\sqrt{3}$ with $\\tan 30^\\circ = 1/\\sqrt{3}$.',
      ],
      speedTargetNote: 'Target <= 5 seconds via $\\theta = 45^\\circ$ and $p + 1/p$ rules.',
    },
  },
  {
    id: 'quant_data_interpretation',
    keywords: ['data interpretation', 'table di', 'line graph', 'mixed graphs', 'bar', 'pie chart', 'tables', 'charts'],
    subject: 'Quantitative Aptitude',
    deck: {
      examFocusLabel: 'CAT · Bank PO · Corporate Analytics Tests',
      summary: 'High-speed visual estimation of ratios, pie-degree conversions, and YoY growth rates.',
      formulas: [
        {
          name: 'Pie-Chart Degree to Percent',
          formula: '$1\\% = 3.6^\\circ, \\qquad \\text{Share \\%} = \\frac{\\theta^\\circ}{360^\\circ} \\times 100$',
          explanation: 'Multiply percentage by $3.6$ to get degrees, or divide degrees by $3.6$ (multiply by $5/18$).',
        },
        {
          name: 'Approximated Ratio Comparison',
          formula: '$\\frac{A}{B} \\text{ vs } \\frac{C}{D} \\iff A\\times D \\text{ vs } B\\times C$',
          explanation: 'Cross-multiply two rounded digits to compare two chart fractions without dividing.',
        },
      ],
      cheatCodes: [
        {
          title: '$10\\%$ / $1\\%$ Anchor Breakdown',
          shortcut: '$23\\% \\text{ of } 840 = 20\\%(168) + 3\\%(25.2) = 193.2$',
          explanation: 'Shift the decimal left by 1 place ($10\\%$) and 2 places ($1\\%$) to compute any percentage mentally in 4 seconds.',
        },
        {
          title: 'Numerator-Denominator Sensitivity Rule',
          shortcut: '$\\text{If } A \\uparrow 10\\% \\text{ and } B \\downarrow 5\\%, \\text{ fraction grows by } \\approx 15\\%$',
          explanation: 'Spot maximum YoY percentage jump directly from widest visual bar gap relative to baseline bar height.',
        },
      ],
      workedExample: {
        problem: 'In a pie chart, R&D expenditure covers $54^\\circ$. What percentage of total budget is R&D?',
        standardApproach: '$(54 / 360) \\times 100 = 5400 / 360 = 15\\%$.',
        cheatCodeApproach: 'Use $3.6^\\circ = 1\\%$ -> $36^\\circ = 10\\%$ and $18^\\circ = 5\\%$, so $54^\\circ = 10\\% + 5\\% = 15\\%$.',
        finalAnswer: '15%',
      },
      commonTraps: [
        'Using percentage-point subtraction ($45\\% - 30\\% = 15\\%$) when asked "by what percent did it increase?" ($(45-30)/30 = 50\\%$).',
        'Over-computing 4 decimal places when MCQ options differ by more than $2\\%$.',
      ],
      speedTargetNote: 'Target <= 7 seconds using 10%/1% anchors and cross-products.',
    },
  },

  // --- REASONING & INTELLIGENCE ---
  {
    id: 'reasoning_series',
    keywords: ['series', 'letter series', 'number series', 'ejoty'],
    subject: 'Reasoning & Intelligence',
    deck: {
      examFocusLabel: 'TCS NQT · Accenture · SSC · RRB',
      summary: 'Decodes arithmetic differences, prime/square offsets, and alphabet shifts in seconds.',
      formulas: [
        {
          name: 'EJOTY & Reverse Alphabet Sum',
          formula: '$E=5,\\; J=10,\\; O=15,\\; T=20,\\; Y=25; \\qquad \\text{Pos}(x) + \\text{Rev}(x) = 27$',
          explanation: 'Compute reverse alphabet letter immediately via $27 - \\text{forward position}$ (e.g., $A(1) \\leftrightarrow Z(26)$).',
        },
        {
          name: 'Second-Order Difference Rule',
          formula: '$\\Delta_i = T_{i+1} - T_i,\\quad \\Delta^2_i = \\Delta_{i+1} - \\Delta_i$',
          explanation: 'If first differences aren’t constant, take the difference of differences—most exam series settle at level 2.',
        },
      ],
      cheatCodes: [
        {
          title: 'Growth Rate Diagnostic (Add vs Multiply)',
          shortcut: '$\\text{Last term } > 3\\times \\text{prev} \\implies \\text{Multiplication / Powers}; \\; < 2\\times \\implies \\text{Differences}$',
          explanation: 'Look at the last two numbers first to pick between difference ladder and $\\times k \\pm c$ immediately.',
        },
        {
          title: 'Cube/Square Near-Neighbor Pattern',
          shortcut: '$n^2 \\pm 1,\\; n^3 \\pm n \\; (0, 6, 24, 60, 120, 210)$',
          explanation: 'Memorize $n^3 - n$: $2, 6, 24, 60, 120, 210$ and $n^3 + n$: $2, 10, 30, 68, 130$. Instant pattern recognition!',
        },
      ],
      workedExample: {
        problem: 'Complete the series: $6, 24, 60, 120, ?$',
        standardApproach: 'Differences: $18, 36, 60$ -> 2nd diff: $18, 24$ (next $+30$) -> diff $= 90 \\implies 120 + 90 = 210$.',
        cheatCodeApproach: 'Recognize $n^3 - n$: $2^3-2=6,\\; 3^3-3=24,\\; 4^3-4=60,\\; 5^3-5=120 \\implies 6^3-6 = 210$.',
        finalAnswer: '210',
      },
      commonTraps: [
        'Missing alternating twin-series where odd positions follow one rule and even positions follow another.',
        'Forgetting prime number steps ($+2, +3, +5, +7, +11$) vs odd steps ($+9$).',
      ],
      speedTargetNote: 'Target <= 6 seconds using last-pair ratio and $n^3 \\pm n$ anchors.',
    },
  },
  {
    id: 'reasoning_coding',
    keywords: ['coding', 'decoding', 'symbol substitution', 'chinese coding', 'word codes'],
    subject: 'Reasoning & Intelligence',
    deck: {
      examFocusLabel: 'Infosys · Cognizant · Banking · SSC',
      summary: 'Cracks forward/reverse letter shifts, criss-cross halves, and multi-statement elimination.',
      formulas: [
        {
          name: 'Opposite Pair Mnemonics',
          formula: '$A\\text{-}Z,\\; B\\text{-}Y,\\; C\\text{-}X,\\; D\\text{-}W,\\; E\\text{-}V,\\; F\\text{-}U,\\; G\\text{-}T,\\; H\\text{-}S,\\; I\\text{-}R,\\; J\\text{-}Q,\\; K\\text{-}P,\\; L\\text{-}O,\\; M\\text{-}N$',
          explanation: 'Every opposite letter pair sums to $27$ ($E=5, V=22 \\implies 5+22=27$).',
        },
      ],
      cheatCodes: [
        {
          title: 'First-and-Last Anchor Elimination',
          shortcut: '$\\text{Decode ONLY the 1st and last letters (or differing middle position) first}$',
          explanation: 'Check MCQ options to find which letter position differs across all 4 options—decode only that single index!',
        },
        {
          title: 'Vowels vs Consonants Split Check',
          shortcut: '$\\text{Check } +1/-1 \\text{ on consonants vs vowel index } (A=1, E=2, I=3, O=4, U=5)$',
          explanation: 'Corporate exams frequently shift vowels differently from consonants or reverse half-word blocks.',
        },
      ],
      workedExample: {
        problem: 'If MIND is coded as NLOE (wait: $M\\to N, I\\to J?\\text{ No, }+1, +2, +3, +4$), how is GOAL coded?',
        standardApproach: '$G+1=H,\\; O+2=Q,\\; A+3=D,\\; L+4=P \\implies \\text{HQDP}$.',
        cheatCodeApproach: 'Check only 1st ($G+1=H$) and last ($L+4=P$) against options to eliminate 3 choices immediately.',
        finalAnswer: 'HQDP',
      },
      commonTraps: [
        'Missing reverse-order writing where the shift $+1$ is applied from back-to-front instead of front-to-back.',
        'Wrap-around miscounts near $Z \\to A$ ($Z + 2 = B$, not error).',
      ],
      speedTargetNote: 'Target <= 6 seconds by checking only differing option characters.',
    },
  },
  {
    id: 'reasoning_syllogism',
    keywords: ['syllogism', 'venn diagram', 'either-or', 'conclusion'],
    subject: 'Reasoning & Intelligence',
    deck: {
      examFocusLabel: 'Bank PO · TCS · SSC · UPSC CSAT',
      summary: 'Applies minimal Venn overlap and strict complementary Either-Or rules with zero guesswork.',
      formulas: [
        {
          name: 'Either-Or Complementary Pair Rule',
          formula: '$\\text{Both individually false} + \\text{Same subject/predicate} + (\\text{Some} + \\text{No}) \\text{ OR } (\\text{All} + \\text{Some Not})$',
          explanation: 'Note: "All + No" is NOT a valid Either-Or complementary pair (they can both be false when "Some" is true).',
        },
        {
          name: 'Only A is B Translation',
          formula: '$\\text{"Only A is B"} \\equiv \\text{"All B are A" (and B cannot touch anything else)}$',
          explanation: 'Flip the order immediately! "Only a few A are B" means BOTH "Some A are B" AND "Some A are not B".',
        },
      ],
      cheatCodes: [
        {
          title: '100-50 Income-Expense Rule',
          shortcut: '$\\text{All}(100,50),\\; \\text{Some}(50,50),\\; \\text{No}(100,100),\\; \\text{Some Not}(50,100)$',
          explanation: 'A $50$ term in the premise can NEVER become $100$ in a definite conclusion. Solves 2-statement syllogisms without drawing circles!',
        },
        {
          title: 'Definite vs Possibility Filter',
          shortcut: '$\\text{Positive premises} \\implies \\text{NO negative definite conclusion}$',
          explanation: 'If all statements are positive ("All", "Some"), immediately cross out any definite negative conclusion ("No", "Some not").',
        },
      ],
      workedExample: {
        problem: 'Statements: All pens are books. Some books are tables. Conclusion I: Some pens are tables. II: No pen is a table.',
        standardApproach: 'Pens & Tables overlap is unlinked (both false individually), forming a Some + No pair on identical terms.',
        cheatCodeApproach: '1) Both individually uncertain; 2) Same terms (pens, tables); 3) Complementary Some + No -> Either I or II follows.',
        finalAnswer: 'Either I or II follows',
      },
      commonTraps: [
        'Assuming "All A are B" implies "All B are A" (it only guarantees "Some B are A").',
        'Treating a Possibility ("can be") as false just because it doesn’t appear in the minimal Venn diagram.',
      ],
      speedTargetNote: 'Target <= 7 seconds using positive-only elimination and Either-Or checks.',
    },
  },
  {
    id: 'reasoning_blood_relations',
    keywords: ['blood relations', 'family', 'relations'],
    subject: 'Reasoning & Intelligence',
    deck: {
      examFocusLabel: 'TCS · Wipro · SSC · Banking',
      summary: 'Standardizes generation levels and gender symbols so coded expressions resolve in one pass.',
      formulas: [
        {
          name: 'Generation Offset Score',
          formula: '$\\text{Parent}(+1),\\; \\text{Child}(-1),\\; \\text{Sibling/Spouse}(0)$',
          explanation: 'Sum generation offsets in coded relation chains first—if an option asks for "Grandfather" (+2) and target sum is +1, eliminate it immediately!',
        },
      ],
      cheatCodes: [
        {
          title: 'Gender + Generation Elimination',
          shortcut: '$\\text{Check final person gender BEFORE drawing full tree}$',
          explanation: 'In "A @ B # C" questions, look only at the symbol attached to the person whose relation is asked—its gender alone drops 2–3 options.',
        },
        {
          title: 'Read Pointing-To Sentences Backwards',
          shortcut: '$\\text{Start from "my" / speaker, then step outward chunk by chunk}$',
          explanation: 'Never read left-to-right on "the son of the only daughter of my father’s wife"—start at "my father’s wife = mother" and walk forward.',
        },
      ],
      workedExample: {
        problem: 'Pointing to a boy, Meera says: "He is the son of the only son of my grandfather." How is the boy related to Meera?',
        standardApproach: 'Grandfather -> only son (Meera’s father) -> son of father (Meera’s brother).',
        cheatCodeApproach: 'Start at "my grandfather" (G+2) -> "only son" (G+1: Father) -> "son" (G0, Male) = Brother.',
        finalAnswer: 'Brother',
      },
      commonTraps: [
        'Assuming gender from a name (e.g., "Kiran" or "A" unless explicitly stated by husband/wife/brother/sister).',
        'Confusing "only child" (no siblings) with "only son" (may still have sisters!).',
      ],
      speedTargetNote: 'Target <= 7 seconds via generation-level + gender filter.',
    },
  },
  {
    id: 'reasoning_direction_sense',
    keywords: ['direction', 'shortest path', 'shadow', 'clockwise'],
    subject: 'Reasoning & Intelligence',
    deck: {
      examFocusLabel: 'Infosys · Police SI · SSC · RRB',
      summary: 'Cancels orthogonal N-S and E-W vectors numerically instead of drawing messy zig-zag paths.',
      formulas: [
        {
          name: 'Net Displacement Theorem',
          formula: '$d = \\sqrt{(N - S)^2 + (E - W)^2}$',
          explanation: 'Accumulate North/South and East/West steps separately, then apply one Pythagorean triplet.',
        },
        {
          name: 'Morning vs Evening Shadow Rule',
          formula: '$\\text{Morning (Sun East)} \\to \\text{Shadow West}; \\qquad \\text{Evening (Sun West)} \\to \\text{Shadow East}$',
          explanation: 'If facing North in the morning, shadow falls to your LEFT; facing South, shadow falls to your RIGHT.',
        },
      ],
      cheatCodes: [
        {
          title: '90-Degree Turn Cancellation (L + R = 0)',
          shortcut: '$\\text{1 Left} + \\text{1 Right} = \\text{No Change}; \\quad 4L \\text{ or } 4R = 0^\\circ; \\quad 2L = \\text{Opposite}$',
          explanation: 'For pure facing-direction questions, count net turns ($\\text{Net} = R - L$) instead of simulating each step!',
        },
        {
          title: '3-4-5 Vector Shortcut',
          shortcut: '$|\\Delta y| = 3k,\\; |\\Delta x| = 4k \\implies \\text{Shortest distance} = 5k$',
          explanation: 'Almost all exam displacement sums reduce to $(3,4,5)$, $(5,12,13)$, or $(6,8,10)$ triplets.',
        },
      ],
      workedExample: {
        problem: 'A person walks 10m North, 12m East, 5m South. Find shortest distance from start.',
        standardApproach: 'Net North = $10 - 5 = 5$m. Net East = $12$m. Distance $= \\sqrt{5^2 + 12^2} = 13$m.',
        cheatCodeApproach: 'Cancel N-S ($10 - 5 = 5$), spot $(5, 12, 13)$ triplet immediately -> $13$m.',
        finalAnswer: '13 meters',
      },
      commonTraps: [
        'Confusing "clockwise/anticlockwise degrees" with left/right 90-degree turns.',
        'At 12:00 Noon, there is NO horizontal shadow side.',
      ],
      speedTargetNote: 'Target <= 5 seconds using N-S/E-W cancellation + triplets.',
    },
  },
  {
    id: 'reasoning_seating_ranking',
    keywords: ['seating', 'order-ranking', 'rank', 'ordering', 'facing', 'linear', 'circular', 'multiple parameters'],
    subject: 'Reasoning & Intelligence',
    deck: {
      examFocusLabel: 'Bank PO · Corporate Logical Reasoning · SSC',
      summary: 'Master rank overlap formulas and fixed-anchor placement for rapid seating puzzles.',
      formulas: [
        {
          name: 'Single-Person Total Rank Formula',
          formula: '$\\text{Total} = L + R - 1$',
          explanation: 'Subtract 1 because the same candidate is counted from both Left and Right ends.',
        },
        {
          name: 'Between-Two-People Overlap Formula',
          formula: '$\\text{Min Total (Overlap)} = (L + R) - \\text{Between} - 2; \\qquad \\text{Max} = L + R + \\text{Between}$',
          explanation: 'Overlap is valid only when $\\text{Between} < \\min(L, R) - 1$.',
        },
      ],
      cheatCodes: [
        {
          title: 'Right/Left Facing Switch Shortcut',
          shortcut: '$\\text{Facing Center/North: Right} = \\text{Counter-Clockwise}; \\quad \\text{Facing Out/South: Flipped}$',
          explanation: 'If two circular rows or North/South rows confuse you, use your own desk edge as North and mirror South.',
        },
        {
          title: 'Swap-Position Total Shortcut',
          shortcut: '$\\text{Total} = (\\text{Person}_1\\text{ New Pos}) + (\\text{Person}_2\\text{ Old Pos}) - 1$',
          explanation: 'When two people swap seats, combine one person’s new rank with the other’s original opposite-end rank minus 1.',
        },
      ],
      workedExample: {
        problem: 'In a row, Ravi is 14th from left and 19th from right. How many students are in the row?',
        standardApproach: '$14 + 19 - 1 = 32$ students.',
        cheatCodeApproach: 'Instant $L + R - 1 = 33 - 1 = 32$.',
        finalAnswer: '32',
      },
      commonTraps: [
        'Using "who" vs "and" wrongly: "A is 2nd to left of B, who is 3rd to right of C" — "who" refers to B, "and" refers to A.',
        'Forgetting $-1$ in Total or $+1$ when converting distance/gap to rank.',
      ],
      speedTargetNote: 'Target <= 5 seconds on rank formulas and swap checks.',
    },
  },
  {
    id: 'reasoning_analogy_classification',
    keywords: ['analogy', 'analogies', 'classification', 'odd-one-out', 'complex relationships'],
    subject: 'Reasoning & Intelligence',
    deck: {
      examFocusLabel: 'SSC · RRB · General Aptitude',
      summary: 'Follows a strict priority hierarchy so number and word analogies resolve consistently.',
      formulas: [
        {
          name: 'Number Analogy Priority Order',
          formula: '$1.\\text{ Prime} \\to 2.\\text{ Cube/Square} \\to 3.\\text{ Multiply/Divide} \\to 4.\\text{ Add/Sub} \\to 5.\\text{ Digit Sum}$',
          explanation: 'Test rules in strict precedence order—prime/square operations override digit-sum tricks in official keys.',
        },
      ],
      cheatCodes: [
        {
          title: 'Gap Jump Ratio Check',
          shortcut: '$a : b :: c : ? \\implies \\text{Check } b = k a \\pm c \\text{ AND } b = a^2 \\pm a$',
          explanation: 'Most tricky analogies like $6 : 42 :: 7 : 56$ use $n(n+1)$ or $n^2 + n$.',
        },
        {
          title: 'Odd-One-Out Letter Gap Coding',
          shortcut: '$\\text{Convert letter triples to numeric differences } (+2, +3) \\text{ immediately}$',
          explanation: 'Compare numeric step vectors of the first two options; the outlier stands out instantly.',
        },
      ],
      workedExample: {
        problem: 'Find the missing term: $12 : 156 :: 15 : ?$',
        standardApproach: '$12 \\times 13 = 156 \\implies 15 \\times 16 = 240$.',
        cheatCodeApproach: 'Rule $n(n+1)$ or $n^2 + n$: $15^2 + 15 = 225 + 15 = 240$.',
        finalAnswer: '240',
      },
      commonTraps: [
        'Applying digit-sum logic before checking obvious squares/cubes/multiples.',
        'Mixing SI unit pairs vs measuring instrument pairs in GK analogies.',
      ],
      speedTargetNote: 'Target <= 5 seconds with strict Prime -> Power -> Product order.',
    },
  },
  {
    id: 'reasoning_clocks_calendars',
    keywords: ['clocks', 'calendars', 'cube', 'dice', 'odd-day', 'days of week', 'months/dates'],
    subject: 'Reasoning & Intelligence',
    deck: {
      examFocusLabel: 'TCS · Capgemini · SSC · APPSC/TSPSC',
      summary: 'Exact clock angle equations, century odd-day codes, and 1-common-face dice rotation.',
      formulas: [
        {
          name: 'Clock Hands Angle Formula',
          formula: '$\\theta = \\left|30H - \\frac{11}{2}M\\right|$',
          explanation: 'If $\\theta > 180^\\circ$, take the reflex complement $360^\\circ - \\theta$ when the smaller angle is asked.',
        },
        {
          name: 'Century Odd Days',
          formula: '$100\\text{ yrs}=5,\\; 200\\text{ yrs}=3,\\; 300\\text{ yrs}=1,\\; 400\\text{ yrs}=0 \\text{ odd days}$',
          explanation: 'Every 400th year is a leap year (e.g., 2000 is leap, 1900 is NOT).',
        },
        {
          name: 'Hands Coincide / Straight Line Interval',
          formula: '$T = \\frac{60}{11} (H \\times 5 \\pm \\text{target})$',
          explanation: 'Hands overlap 11 times in 12 hours (22 times in 24 hours) and form $90^\\circ$ 22 times in 12 hours (44 times/day).',
        },
      ],
      cheatCodes: [
        {
          title: 'Same-Calendar Repeat Shortcut',
          shortcut: '$\\text{Leap Year} + 28,\\; (\\text{Leap}+1) + 6,\\; (\\text{Leap}+2/+3) + 11$',
          explanation: 'Instant calendar repeat year without counting odd days across decades!',
        },
        {
          title: 'One-Common-Face Clockwise Dice Rule',
          shortcut: '$\\text{Write 3 visible faces clockwise starting from the shared face; vertical pairs are opposite}$',
          explanation: 'If two dice share TWO faces, the remaining two unshared faces are automatically opposite each other.',
        },
      ],
      workedExample: {
        problem: 'Find the smaller angle between hour and minute hands at 3:40.',
        standardApproach: '$|30(3) - 5.5(40)| = |90 - 220| = 130^\\circ$.',
        cheatCodeApproach: 'Instant formula: $|90 - 220| = 130^\\circ$ ($< 180^\\circ$, so no $360-\\theta$ needed).',
        finalAnswer: '130°',
      },
      commonTraps: [
        'Treating century years like 1900 or 2100 as leap years (must divide by 400).',
        'Assuming hands meet 12 times in 12 hours (between 11 and 1 they meet only once, at 12:00).',
      ],
      speedTargetNote: 'Target <= 6 seconds using $|30H - 5.5M|$ and clockwise dice rule.',
    },
  },
  {
    id: 'reasoning_analytical',
    keywords: ['analytical statements', 'assumptions', 'courses of action', 'inference', 'statement-', 'comparison puzzles'],
    subject: 'Reasoning & Intelligence',
    deck: {
      examFocusLabel: 'UPSC CSAT · Banking Mains · Corporate Psychometric',
      summary: 'Decision heuristics to eliminate extreme, out-of-scope, or counter-productive logical options.',
      formulas: [
        {
          name: 'Implicit Assumption Test',
          formula: '$\\text{Statement Valid} \\implies \\text{Assumption Must Hold True}$',
          explanation: 'Negate the assumption mentally: if the original statement stops making sense, the assumption IS implicit.',
        },
      ],
      cheatCodes: [
        {
          title: 'Extreme Keyword Red-Flag Filter',
          shortcut: '$\\text{Reject } \\{\\text{"ONLY", "ALWAYS", "NEVER", "ALL", "MUST BE BANNED"}\\}$',
          explanation: 'In assumptions, inferences, and courses of action, absolute extremes or harsh disproportionate remedies are almost always invalid.',
        },
        {
          title: 'Balanced Course-of-Action Rule',
          shortcut: '$\\text{Valid action} = \\text{Practical} + \\text{Directly reduces problem} + \\text{Creates no new crisis}$',
          explanation: 'Reject steps that lie outside the authority of the stated actor or merely repeat the problem.',
        },
      ],
      workedExample: {
        problem: 'Statement: "To improve punctuality, company X introduced biometric check-in." Assumption: Employees may respond to tracked attendance.',
        standardApproach: 'Without believing tracking improves punctuality, introducing biometrics makes no logical sense.',
        cheatCodeApproach: 'Negation test: if employees will NOT respond to tracking, introducing biometrics is pointless -> Assumption is implicit.',
        finalAnswer: 'Implicit',
      },
      commonTraps: [
        'Importing outside real-world trivia not grounded in the given statement.',
        'Accepting restatements as hidden assumptions.',
      ],
      speedTargetNote: 'Target <= 8 seconds via negation test and extreme-word rejection.',
    },
  },

  // --- GENERAL AWARENESS ---
  {
    id: 'ga_constitution',
    keywords: ['constitution', 'fundamental rights', 'fundamental duties', 'directive principles', 'dpsp', 'preamble', 'amendment', 'articles', 'state government', 'local government', 'election', 'political parties', 'federal', 'center-state', 'important laws'],
    subject: 'General Awareness',
    deck: {
      examFocusLabel: 'UPSC · SSC CGL · APPSC · TSPSC · SI',
      summary: 'High-yield constitutional structure, article memory ladders, and writ/amendment mnemonics.',
      formulas: [
        {
          name: 'Fundamental Rights Ladder (Articles 14–32)',
          formula: '$\\text{Equality}(14\\text{-}18) \\to \\text{Freedom}(19\\text{-}22) \\to \\text{Exploitation}(23\\text{-}24) \\to \\text{Religion}(25\\text{-}28) \\to \\text{Culture/Edu}(29\\text{-}30) \\to \\text{Writs}(32)$',
          explanation: 'Pinpoint any Fundamental Right article instantly by anchoring its group start (14, 19, 23, 25, 29, 32).',
        },
        {
          name: 'Supreme Court vs High Court Writs',
          formula: '$\\text{SC: Art. 32 (FR only)} \\quad | \\quad \\text{HC: Art. 226 (FR + Legal Rights)}$',
          explanation: 'High Court writ jurisdiction under Art. 226 is WIDER than Supreme Court under Art. 32.',
        },
      ],
      cheatCodes: [
        {
          title: '12 Schedules Mnemonic ("TEARS OF OLD PM")',
          shortcut: 'T(Territories) E(Emoluments) A(Affirmations) R(Rajya Sabha) S(Scheduled Areas) · O(Other Tribal) F(Federal Lists) · O(Official Lang) L(Land Reforms) D(Defection) · P(Panchayat) M(Municipal)',
          explanation: 'Recalls all 12 Schedules in exact numerical order (1 to 12) in under 4 seconds.',
        },
        {
          title: 'Key Amendments Cheat Sheet',
          shortcut: '$42^{\\text{nd}}(1976)\\text{ Mini-Const.} \\; | \\; 44^{\\text{th}}\\text{ Property} \\to 300A \\; | \\; 73/74^{\\text{th}}\\text{ Local Govt} \\; | \\; 86^{\\text{th}}\\text{ Art.21A} \\; | \\; 101^{\\text{st}}\\text{ GST}$',
          explanation: 'Nearly 70% of SSC/State PSC Amendment MCQs test these five milestone amendments.',
        },
      ],
      workedExample: {
        problem: 'Which Constitutional Article grants the Right to Education (6–14 years) added by the 86th Amendment?',
        standardApproach: 'Article 21A inserted in Part III via 86th Constitutional Amendment Act, 2002.',
        cheatCodeApproach: 'Anchor: $86^{\\text{th}}$ Amendment = Education trio ($21\\text{A}$ FR, $45$ DPSP, $51\\text{A}(k)$ Duty).',
        finalAnswer: 'Article 21A',
      },
      commonTraps: [
        'Confusing Article 32 (SC writs) with Article 226 (HC writs), or Article 17 (Untouchability) with Article 18 (Titles).',
        'Assuming Right to Property is still a Fundamental Right (moved to Art. 300A by 44th Amendment).',
      ],
      speedTargetNote: 'Target <= 4 seconds via TEARS OF OLD PM and Article anchors.',
    },
  },
  {
    id: 'ga_parliament',
    keywords: ['parliament', 'executive', 'judiciary', 'money bill', 'constitutional bodies', 'cag'],
    subject: 'General Awareness',
    deck: {
      examFocusLabel: 'UPSC · SSC · State PSC',
      summary: 'Fast comparison rules between Lok Sabha, Rajya Sabha, Money Bills, and Constitutional Watchdogs.',
      formulas: [
        {
          name: 'Legislative Joint Sitting & Money Bill Rule',
          formula: '$\\text{Money Bill (Art. 110)} \\to \\text{Lok Sabha only (RS: 14 days max, NO Joint Sitting)}$',
          explanation: 'Joint sitting (Art. 108, called by President, presided by LS Speaker) applies ONLY to Ordinary & Financial Bills, never Money or Constitutional Amendment Bills.',
        },
        {
          name: 'Constitutional Articles Quick Map',
          formula: '$\\text{CAG}(148) \\; | \\; \\text{Finance Comm.}(280) \\; | \\; \\text{Election Comm.}(324) \\; | \\; \\text{Emergency}(352, 356, 360)$',
          explanation: 'Also keep Attorney General (Art. 76) and UPSC (Art. 315) anchored.',
        },
      ],
      cheatCodes: [
        {
          title: 'The "+1 / +90" Governor & State Counterpart Rule',
          shortcut: '$\\text{President Ord. }(123) \\leftrightarrow \\text{Gov. }(213); \\quad \\text{PM/CoM }(74/75) + 89 \\approx \\text{CM/CoM }(163/164)$',
          explanation: 'Swap digits 1-2-3 to 2-1-3 for Ordinance powers, and add ~89–90 to Union Executive/Parliament articles to estimate State counterparts.',
        },
      ],
      workedExample: {
        problem: 'Who certifies whether a Bill is a Money Bill under Article 110?',
        standardApproach: 'Speaker of the Lok Sabha holds final, non-justiciable certification authority.',
        cheatCodeApproach: 'Rule: Money Bill = LS exclusive domain -> LS Speaker certifies; Rajya Sabha gets only 14 days.',
        finalAnswer: 'Speaker of the Lok Sabha',
      },
      commonTraps: [
        'Thinking President or Prime Minister presides over a Joint Sitting (President SUMMONS; LS Speaker PRESIDES).',
        'Confusing Finance Commission (Art. 280) with NITI Aayog (non-constitutional body).',
      ],
      speedTargetNote: 'Target <= 4 seconds via Article parity (+89 / 123-213) rules.',
    },
  },
  {
    id: 'ga_history_culture',
    keywords: ['ancient', 'medieval', 'history', 'culture', 'indus', 'mauryan', 'gupta', 'bhakti', 'vedic', 'mahajanapada', 'sultanate', 'mughal', 'sufi', 'maratha', 'architecture', 'dance', 'music', 'painting'],
    subject: 'General Awareness',
    deck: {
      examFocusLabel: 'UPSC · SSC · RRB NTPC · State PSC',
      summary: 'Chronological dynasty anchors, Buddhist councils, and classical culture pairings.',
      formulas: [
        {
          name: 'Dynasty Timeline Sequence',
          formula: '$\\text{Haryanka} \\to \\text{Nanda} \\to \\text{Maurya} \\to \\text{Shunga} \\to \\text{Kushana} \\to \\text{Gupta} \\to \\text{Vardhana}$',
          explanation: 'Chronological ordering locks ancient ruler, traveler, and inscription dates cleanly.',
        },
      ],
      cheatCodes: [
        {
          title: '4 Buddhist Councils Trick ("R-V-P-K" + "A-K-A-K")',
          shortcut: '$\\text{Places: Rajgriha, Vaishali, Pataliputra, Kashmir} \\quad | \\quad \\text{Kings: Ajatashatru, Kalasoka, Ashoka, Kanishka}$',
          explanation: 'Matches Venue, Patron King, and Council Number (1st to 4th) in one 3-second mnemonic.',
        },
        {
          title: 'Delhi Sultanate Sequence ("G-K-T-S-L")',
          shortcut: '$\\text{Ghulam (Slave)} \\to \\text{Khilji} \\to \\text{Tughlaq} \\to \\text{Sayyid} \\to \\text{Lodi (1206–1526)}$',
          explanation: 'Also anchor Mughal sequence: B-H-A-J-S-A (Babur, Humayun, Akbar, Jahangir, Shah Jahan, Aurangzeb).',
        },
      ],
      workedExample: {
        problem: 'Under whose patronage was the Third Buddhist Council held at Pataliputra?',
        standardApproach: 'Emperor Ashoka convened the 3rd Council at Pataliputra presided over by Moggaliputta Tissa.',
        cheatCodeApproach: 'R-V-P-K + A-K-A-K -> 3rd letters: P (Pataliputra) + A (Ashoka).',
        finalAnswer: 'Ashoka',
      },
      commonTraps: [
        'Confusing Fa-Hien (visited during Chandragupta II / Gupta) with Hiuen Tsang (visited during Harshavardhana).',
        'Mixing up Classical Dances by state (Kuchipudi = AP, Kathakali/Mohiniyattam = Kerala, Bharatanatyam = TN, Sattriya = Assam).',
      ],
      speedTargetNote: 'Target <= 4 seconds with R-V-P-K and B-H-A-J-S-A mnemonics.',
    },
  },
  {
    id: 'ga_modern_freedom',
    keywords: ['modern indian freedom', '1857', '1947', 'inc session', 'gandhi', 'viceroy', 'advent of europeans', 'east india company', 'social reform', 'national congress', 'revolutionary', 'independence'],
    subject: 'General Awareness',
    deck: {
      examFocusLabel: 'UPSC · SSC · SI · APPSC/TSPSC',
      summary: 'Maps major Gandhian movements, INC landmark sessions, and British Constitutional Acts chronologically.',
      formulas: [
        {
          name: 'Gandhian Timeline Anchor',
          formula: '$1917\\text{ Champaran} \\to 1918\\text{ Ahmedabad/Kheda} \\to 1920\\text{ NCM} \\to 1930\\text{ CDM (Dandi)} \\to 1942\\text{ Quit India}$',
          explanation: 'Remember C-A-K ("CAKE") for 1917–1918 initial satyagrahas before the three mass movements.',
        },
      ],
      cheatCodes: [
        {
          title: 'Milestone INC Sessions Cheat Code',
          shortcut: '$1885\\text{ Bombay(WC Bonnerjee)} \\; | \\; 1907\\text{ Surat Split} \\; | \\; 1916\\text{ Lucknow Pact} \\; | \\; 1924\\text{ Belgaum(Gandhi)} \\; | \\; 1929\\text{ Lahore(Purna Swaraj)}$',
          explanation: 'Also remember Annie Besant (1917 Calcutta, 1st woman) vs Sarojini Naidu (1925 Kanpur, 1st Indian woman).',
        },
      ],
      workedExample: {
        problem: 'Which INC session was the ONLY session presided over by Mahatma Gandhi?',
        standardApproach: '1924 Belgaum Session (Karnataka).',
        cheatCodeApproach: '1924 Belgaum = Gandhi’s sole INC presidency.',
        finalAnswer: 'Belgaum Session (1924)',
      },
      commonTraps: [
        'Confusing 1st Round Table Conference (no INC) with 2nd RTC (Gandhi attended after Gandhi-Irwin Pact 1931).',
        'Mixing up 1909 (Morley-Minto: separate electorates), 1919 (Montagu-Chelmsford: Dyarchy in provinces), and 1935 (Provincial autonomy + Federal court).',
      ],
      speedTargetNote: 'Target <= 4 seconds using C-A-K and INC landmark anchors.',
    },
  },
  {
    id: 'ga_geography',
    keywords: ['geography', 'river', 'climate', 'monsoon', 'national park', 'passes', 'soil', 'physical features', 'natural resources'],
    subject: 'General Awareness',
    deck: {
      examFocusLabel: 'UPSC · SSC · RRB · State PSC',
      summary: 'High-speed drainage basin grouping, mountain pass mapping, and atmospheric layer recall.',
      formulas: [
        {
          name: 'West-Flowing vs East-Flowing Peninsular Rivers',
          formula: '$\\text{West (Estuary): Narmada, Tapi, Mahi, Sabarmati, Luni} \\quad | \\quad \\text{East (Delta): Godavari, Krishna, Mahanadi, Kaveri}$',
          explanation: 'Rift-valley rivers (Narmada, Tapi) flow west into the Arabian Sea without forming deltas.',
        },
      ],
      cheatCodes: [
        {
          title: 'Atmosphere Layers Bottom-Up ("Trust Me In The Exam")',
          shortcut: 'Troposphere (Weather) -> Stratosphere (Ozone/Jets) -> Mesosphere (Meteors burn) -> Thermosphere/Ionosphere (Radio waves) -> Exosphere',
          explanation: 'Answers 95% of atmosphere MCQs in 3 seconds.',
        },
        {
          title: 'Indus Water Treaty River Split',
          shortcut: '$\\text{West (Pakistan 80\\%): Indus, Jhelum, Chenab} \\quad | \\quad \\text{East (India 100\\%): Ravi, Beas, Sutlej}$',
          explanation: 'North-to-south order: I-J-C-R-B-S.',
        },
      ],
      workedExample: {
        problem: 'Which river flows through a rift valley into the Arabian Sea forming an estuary instead of a delta?',
        standardApproach: 'Narmada (between Vindhya and Satpura ranges) flows west into the Gulf of Khambhat.',
        cheatCodeApproach: 'West-flowing rift pair = Narmada & Tapi (no delta, estuary only).',
        finalAnswer: 'Narmada',
      },
      commonTraps: [
        'Confusing Tropic of Cancer states (8 states: GJ, RJ, MP, CG, JH, WB, TR, MZ) with IST Meridian 82.5°E states (5 states: UP, MP, CG, OD, AP).',
        'Assuming ozone layer is in the Troposphere (good ozone is in Stratosphere).',
      ],
      speedTargetNote: 'Target <= 4 seconds with river-direction & atmosphere mnemonics.',
    },
  },
  {
    id: 'ga_economy',
    keywords: ['economy', 'economic concepts', 'rbi', 'monetary policy', 'budgeting', 'gdp', 'gst', 'repo'],
    subject: 'General Awareness',
    deck: {
      examFocusLabel: 'Banking · UPSC · SSC · Finance Aptitude',
      summary: 'Predicts inflation/liquidity effects of RBI policy tools and distinguishes GDP/GNP/Fiscal metrics.',
      formulas: [
        {
          name: 'National Income Identities',
          formula: '$\\text{GNP} = \\text{GDP} + \\text{NFIA}, \\qquad \\text{NNP}_{\\text{FC}} = \\text{GNP}_{\\text{MP}} - \\text{Dep} - \\text{Net Indirect Taxes}$',
          explanation: 'Net National Product at Factor Cost ($\\text{NNP}_{\\text{FC}}$) equals official National Income.',
        },
        {
          name: 'Fiscal vs Primary Deficit',
          formula: '$\\text{Primary Deficit} = \\text{Fiscal Deficit} - \\text{Interest Payments}$',
          explanation: 'Shows current borrowing needed excluding inherited debt interest burden.',
        },
      ],
      cheatCodes: [
        {
          title: 'RBI Inflation Fight Rule ("Rates UP = Money DOWN")',
          shortcut: '$\\uparrow (\\text{Repo, CRR, SLR, Bank Rate}) \\implies \\downarrow \\text{Liquidity} \\implies \\text{Controls Inflation}$',
          explanation: 'All 4 policy rates move in the SAME direction to tighten money supply; reverse direction stimulates growth.',
        },
      ],
      workedExample: {
        problem: 'When RBI lowers the Cash Reserve Ratio (CRR), what happens to bank lending capacity?',
        standardApproach: 'Banks lock fewer funds interest-free at RBI, leaving more lendable cash and expanding credit.',
        cheatCodeApproach: 'Rates DOWN = Liquidity UP -> Credit & money supply increase.',
        finalAnswer: 'Lending capacity and liquidity increase',
      },
      commonTraps: [
        'Confusing Repo Rate (RBI lends to banks) with Reverse Repo / SDF (RBI absorbs surplus funds from banks).',
        'Thinking CRR earns interest for commercial banks (CRR earns ZERO interest; SLR in G-secs earns yield).',
      ],
      speedTargetNote: 'Target <= 5 seconds using Rates-vs-Liquidity inverse rule.',
    },
  },
  {
    id: 'ga_general_science',
    keywords: ['general science', 'physics', 'chemistry', 'biology', 'vitamin', 'si unit', 'scientific', 'inventions'],
    subject: 'General Awareness',
    deck: {
      examFocusLabel: 'RRB NTPC · RRB Group D · SSC · Police',
      summary: 'High-frequency physics lens/circuit equations, vitamin-deficiency pairs, and chemical names.',
      formulas: [
        {
          name: 'Mirror, Lens & Ohm’s Law',
          formula: '$\\frac{1}{f} = \\frac{1}{v} + \\frac{1}{u}\\;(\\text{Mirror}), \\quad P(\\text{D}) = \\frac{1}{f(\\text{m})}, \\quad V = IR$',
          explanation: 'Lens formula has minus ($1/f = 1/v - 1/u$). Focal length $f$ must be in meters for Power in Diopters.',
        },
      ],
      cheatCodes: [
        {
          title: 'Water-Soluble vs Fat-Soluble Vitamins',
          shortcut: '$\\text{Fat-Soluble: A, D, E, K ("KEDA")} \\quad | \\quad \\text{Water-Soluble: B-complex & C}$',
          explanation: 'Deficiency anchors: A (Night blindness), B1 (Beriberi), C (Scurvy), D (Rickets), K (Clotting failure).',
        },
        {
          title: 'Chemical Formula Quick Pairs',
          shortcut: '$\\text{Baking Soda: } \\text{NaHCO}_3 \\; | \\; \\text{Washing Soda: } \\text{Na}_2\\text{CO}_3\\cdot 10\\text{H}_2\\text{O} \\; | \\; \\text{Bleaching: } \\text{CaOCl}_2$',
          explanation: 'Remember "B" for Bi-carbonate = Baking Soda.',
        },
      ],
      workedExample: {
        problem: 'A convex lens has focal length $+25\\text{ cm}$. What is its optical power?',
        standardApproach: '$f = +0.25\\text{ m} \\implies P = 1/0.25 = +4\\text{ D}$.',
        cheatCodeApproach: 'Use $P = 100 / f(\\text{cm}) = 100 / 25 = +4\\text{ D}$ directly without converting to decimals.',
        finalAnswer: '+4 Diopters',
      },
      commonTraps: [
        'Forgetting minus sign for concave lens power (diverging = negative D; convex/converging = positive D).',
        'Confusing Brass ($\\text{Cu} + \\text{Zn}$) with Bronze ($\\text{Cu} + \\text{Sn}$).',
      ],
      speedTargetNote: 'Target <= 4 seconds via $100/f_{\\text{cm}}$ and KEDA vitamin grouping.',
    },
  },
  {
    id: 'ga_space_ecology',
    keywords: ['space tech', 'isro', 'ecology', 'ramsar', 'biodiversity', 'climate agreement', 'conservation'],
    subject: 'General Awareness',
    deck: {
      examFocusLabel: 'UPSC · SSC · RRB · State PSC',
      summary: 'Connects ISRO launch vehicles, orbital classes, and global environmental treaties cleanly.',
      formulas: [
        {
          name: 'Environmental Treaty Purpose Matrix',
          formula: '$\\text{Ramsar(Wetlands)} \\; | \\; \\text{Montreal(Ozone/CFCs)} \\; | \\; \\text{Kyoto(GHGs)} \\; | \\; \\text{Paris}(1.5^\\circ\\text{C})$',
          explanation: 'Pair each treaty city strictly with its single primary target substance or ecosystem.',
        },
      ],
      cheatCodes: [
        {
          title: 'ISRO Rocket Hierarchy',
          shortcut: '$\\text{SSLV (Small LEO)} < \\text{PSLV (Workhorse/Polar)} < \\text{GSLV Mk-II (Cryogenic)} < \\text{LVM3 (Heavy/Chandrayaan-3)}$',
          explanation: 'PSLV uses alternating Solid-Liquid stages (S-L-S-L); LVM3 has twin S200 solid boosters + L110 core + C25 cryo upper stage.',
        },
      ],
      workedExample: {
        problem: 'Which international protocol specifically targets the phase-out of ozone-depleting CFCs?',
        standardApproach: 'Montreal Protocol (1987), following the Vienna Convention.',
        cheatCodeApproach: 'M-O-ntreal = O-zone; K-yoto = Carbon/GHG; R-amsar = Wetlands.',
        finalAnswer: 'Montreal Protocol (1987)',
      },
      commonTraps: [
        'Confusing Kyoto Protocol (binding GHG emission cuts) with Montreal Protocol (ozone CFCs).',
        'Mixing up Aditya-L1 (Lagrange Point L1 solar mission) with Chandrayaan-3 (LVM3 lunar south pole).',
      ],
      speedTargetNote: 'Target <= 4 seconds via treaty-keyword matching.',
    },
  },
  {
    id: 'ga_banking_awareness',
    keywords: ['banking', 'banks', 'financial markets', 'npci', 'upi', 'basel', 'sebi', 'nabard'],
    subject: 'General Awareness',
    deck: {
      examFocusLabel: 'IBPS PO/Clerk · SBI · RBI Grade B',
      summary: 'Clarifies payment rails, financial regulators, and Priority Sector Lending targets.',
      formulas: [
        {
          name: 'Priority Sector Lending (PSL) Target',
          formula: '$\\text{Domestic Commercial Banks: } 40\\% \\text{ ANBC} \\quad (\\text{Agriculture } 18\\%,\\; \\text{Weaker Sections } 12\\%)$',
          explanation: 'RRBs and Small Finance Banks hold a higher $75\\%$ PSL mandate.',
        },
      ],
      cheatCodes: [
        {
          title: 'Indian Financial Regulator Split',
          shortcut: '$\\text{RBI(Banks/Payments)} \\; | \\; \\text{SEBI(Stocks/MF)} \\; | \\; \\text{IRDAI(Insurance)} \\; | \\; \\text{PFRDA(NPS/Pension)}$',
          explanation: 'Also anchor NPCI for retail rails: UPI, IMPS, RuPay, FASTag, NACH, AePS.',
        },
      ],
      workedExample: {
        problem: 'Which institution owns and operates the Unified Payments Interface (UPI) infrastructure?',
        standardApproach: 'National Payments Corporation of India (NPCI), an umbrella initiative of RBI and IBA.',
        cheatCodeApproach: 'Retail digital payments (UPI, RuPay, IMPS, AePS) = NPCI.',
        finalAnswer: 'NPCI',
      },
      commonTraps: [
        'Confusing NEFT (half-hourly batches, no min/max) with RTGS (real-time gross, minimum Rs. 2 lakh).',
        'Thinking NABARD lends directly to individual farmers (it is a refinance apex bank).',
      ],
      speedTargetNote: 'Target <= 4 seconds with Regulator & Payment-Rail cheat table.',
    },
  },
  {
    id: 'ga_state_special',
    keywords: ['state special', 'appsc', 'tspsc', 'panchayat', 'schedule xi'],
    subject: 'General Awareness',
    deck: {
      examFocusLabel: 'APPSC · TSPSC · State PSC · SI/Constable',
      summary: 'High-yield Panchayati Raj articles, reorganization dates, and three-tier governance frameworks.',
      formulas: [
        {
          name: '73rd & 74th Constitutional Amendments',
          formula: '$73^{\\text{rd}}\\text{ (Panchayats): Part IX, Art. 243–243O, 11th Sch (29 items)} \\; | \\; 74^{\\text{th}}\\text{ (Municipalities): Part IXA, 12th Sch (18 items)}$',
          explanation: 'Key articles: 243D (1/3rd reservation for women), 243I (State Finance Comm.), 243K (State Election Comm.).',
        },
      ],
      cheatCodes: [
        {
          title: 'Committee Sequence for Panchayati Raj ("B-A-G-L")',
          shortcut: '$\\text{Balwant Rai Mehta (1957, 3-tier)} \\to \\text{Ashok Mehta (1977, 2-tier)} \\to \\text{GVK Rao (1985)} \\to \\text{LM Singhvi (1986, Const. Status)}$',
          explanation: 'Remember B-A-G-L to answer chronology and tier-count questions instantly.',
        },
      ],
      workedExample: {
        problem: 'Which committee first recommended a 3-tier Panchayati Raj system in India?',
        standardApproach: 'Balwant Rai Mehta Committee (1957); first implemented in Nagaur, Rajasthan (Oct 2, 1959).',
        cheatCodeApproach: 'B-A-G-L: First = Balwant Rai Mehta (3 words = 3-tier!).',
        finalAnswer: 'Balwant Rai Mehta Committee',
      },
      commonTraps: [
        'Confusing Balwant Rai Mehta (3-tier) with Ashok Mehta (2-tier).',
        'Assuming Central Election Commission conducts Panchayat elections (State Election Commission under Art. 243K does).',
      ],
      speedTargetNote: 'Target <= 4 seconds via B-A-G-L and 73rd/74th Schedule split.',
    },
  },

  // --- ENGLISH COMPREHENSION ---
  {
    id: 'english_grammar_sva',
    keywords: ['error spotting', 'subject-verb', 'tense', 'agreement', 'error correction'],
    subject: 'English Comprehension',
    deck: {
      examFocusLabel: 'SSC · Banking · Corporate Verbal · SI',
      summary: 'Isolates true grammatical subjects across prepositional clauses and enforces conditional tense matching.',
      formulas: [
        {
          name: 'Three Conditional Tense Equations',
          formula: '$\\text{Type I: If }+V_1 \\to \\text{will}+V_1 \\;|\\; \\text{Type II: If }+V_2/\\text{were} \\to \\text{would}+V_1 \\;|\\; \\text{Type III: If }+\\text{had }V_3 \\to \\text{would have }V_3$',
          explanation: 'Never put "will" or "would have" inside the IF-clause itself.',
        },
      ],
      cheatCodes: [
        {
          title: 'Cross-Out Prepositional Phrase Trick',
          shortcut: '$\\text{Subject} + (\\text{along with / as well as / besides} + \\text{Noun}_2) \\implies \\text{Verb matches } \\text{Subject}_1$',
          explanation: 'Unlike "Neither...nor" (which matches the NEAREST subject), "as well as / along with" always follows the FIRST subject.',
        },
        {
          title: 'Indefinite Pronoun Singular Lock',
          shortcut: '$\\text{Each, Every, Everyone, Neither, Either, Many a} \\implies \\text{Always SINGULAR Verb}$',
          explanation: 'Even in "Each of the boys", cross out "of the boys" -> "Each HAS", not "Each HAVE".',
        },
      ],
      workedExample: {
        problem: 'Spot the error: "The quality of the mangoes (A) / were not good (B) / enough for export (C) / No error (D)."',
        standardApproach: 'True subject is singular "quality" (not plural "mangoes"), so "were" must be "was".',
        cheatCodeApproach: 'Cross out "of the mangoes" -> "The quality WERE" sounds wrong immediately -> Error in (B).',
        finalAnswer: 'Part (B) — replace "were" with "was"',
      },
      commonTraps: [
        'Using "would have" in both halves of a Type III conditional ("If he would have studied..." is WRONG; use "Had he studied...").',
        'Putting plural verbs after "The number of..." (Singular verb) vs "A number of..." (Plural verb).',
      ],
      speedTargetNote: 'Target <= 5 seconds by stripping "of / along with" clauses.',
    },
  },
  {
    id: 'english_voice_narration',
    keywords: ['active-passive', 'voice', 'narration', 'direct-indirect'],
    subject: 'English Comprehension',
    deck: {
      examFocusLabel: 'SSC CGL/CHSL · State Exams · SI',
      summary: 'Solves Voice & Narration MCQs in 4 seconds solely by matching the auxiliary verb without reading the whole sentence.',
      formulas: [
        {
          name: 'Voice Auxiliary Shift Table',
          formula: '$V_1 \\to \\text{is/am/are } V_3 \\;|\\; V_2 \\to \\text{was/were } V_3 \\;|\\; \\text{ing} \\to \\text{being } V_3 \\;|\\; \\text{has/have/had} \\to \\text{been } V_3$',
          explanation: 'Active-to-Passive NEVER changes tense (present stays present, past stays past)—only adds BE + $V_3$.',
        },
      ],
      cheatCodes: [
        {
          title: '2-Second Auxiliary-Only Elimination',
          shortcut: '$\\text{Check ONLY the helping verb first (ignoring subject/object words)}$',
          explanation: '90% of SSC Voice/Narration options differ solely in tense auxiliary ("is" vs "was" vs "has been" vs "being"). Match the helper and click!',
        },
        {
          title: 'Universal Truth & Interrogative Rule (Narration)',
          shortcut: '$\\text{Universal truths keep PRESENT tense}; \\quad \\text{Questions drop } \\text{did/do} \\text{ and put Subject before Verb}$',
          explanation: 'In indirect speech, change "He asked where was I going" -> "He asked where I was going".',
        },
      ],
      workedExample: {
        problem: 'Change voice: "The committee is reviewing the proposal."',
        standardApproach: 'Present Continuous ("is reviewing") -> "is being reviewed" -> "The proposal is being reviewed by the committee."',
        cheatCodeApproach: 'Scan options only for "is being reviewed" (eliminates "was being", "has been", "is reviewed").',
        finalAnswer: 'The proposal is being reviewed by the committee.',
      },
      commonTraps: [
        'Changing tense during Active-Passive conversion (tense ONLY backshifts in Direct-Indirect Narration, NOT Voice!).',
        'Keeping question inversion ("did he go") inside Indirect Narration instead of statement order ("he had gone").',
      ],
      speedTargetNote: 'Target <= 4 seconds via auxiliary verb scanning.',
    },
  },
  {
    id: 'english_vocab',
    keywords: ['synonyms', 'antonyms', 'one-word', 'one word', 'vocabulary'],
    subject: 'English Comprehension',
    deck: {
      examFocusLabel: 'CAT · GRE/GMAT · SSC · Banking',
      summary: 'Uses Latin/Greek roots and positive/negative polarity to crack unfamiliar vocabulary fast.',
      formulas: [
        {
          name: 'High-Yield Root Decoder',
          formula: '$\\text{Bene/Eu}(+) \\; | \\; \\text{Mal/Dys}(-) \\; | \\; \\text{Chron}(\\text{Time}) \\; | \\; \\text{Phil/Phob}(\\text{Love/Fear}) \\; | \\; \\text{Omni}(\\text{All})$',
          explanation: 'Break unfamiliar words into prefix + root + suffix to infer meaning and tone.',
        },
      ],
      cheatCodes: [
        {
          title: 'Tone Polarity (+ / − / Neutral) Elimination',
          shortcut: '$\\text{If target word is negative and 3 options are positive, pick the lone negative option}$',
          explanation: 'For Antonyms, flip polarity: if target is negative, only a positive option can be correct.',
        },
        {
          title: 'Odd-One-Out Synonym Cluster',
          shortcut: '$\\text{In Antonym MCQs, 3 options are often synonyms of the target word—pick the odd one!}$',
          explanation: 'Exam setters build distractors using synonyms of the prompt; spotting 2–3 matching options reveals the answer immediately.',
        },
      ],
      workedExample: {
        problem: 'Select the ANTONYM of "BENEVOLENT": (A) Kind (B) Generous (C) Malevolent (D) Charitable',
        standardApproach: 'Bene = good; Male = bad/evil -> Malevolent is opposite.',
        cheatCodeApproach: 'A, B, D are all positive synonyms of each other -> lone negative option (C) is the answer.',
        finalAnswer: 'Malevolent',
      },
      commonTraps: [
        'Selecting a Synonym when the question header asks for ANTONYM (always read the capitalized instruction word first!).',
        'Confusing look-alike roots: "emulate" (imitate to equal) vs "ameliorate" (improve).',
      ],
      speedTargetNote: 'Target <= 4 seconds via root + polarity clustering.',
    },
  },
  {
    id: 'english_idioms_prepositions',
    keywords: ['idioms', 'phrase', 'fixed prepositions', 'phrasal verbs'],
    subject: 'English Comprehension',
    deck: {
      examFocusLabel: 'SSC · Banking · Corporate Verbal',
      summary: 'Resolves fixed prepositions and idiomatic expressions using figurative imagery and verb-particle pairing.',
      formulas: [
        {
          name: 'Top Fixed Preposition Pairs',
          formula: '$\\text{Abide BY} \\;|\\; \\text{Accused OF} \\;|\\; \\text{Senior/Prefer TO} \\;|\\; \\text{Prevent FROM} \\;|\\; \\text{Comprise } (\\varnothing \\text{ of})$',
          explanation: 'Latin comparatives ending in "-ior" (senior, junior, superior, prior, prefer) ALWAYS take "TO", never "than".',
        },
      ],
      cheatCodes: [
        {
          title: 'Literal Trap Rejection in Idioms',
          shortcut: '$\\text{Idiom answers are NEVER literal word-for-word definitions}$',
          explanation: 'If an option uses the literal noun from the idiom ("spill the beans" -> "drop vegetables"), eliminate it immediately.',
        },
        {
          title: '"No Preposition" Transitive Verb Check',
          shortcut: '$\\text{Discuss, Describe, Emphasize, Comprise, Attack, Order (verb)} \\to \\text{NO "about/of/on" after them}$',
          explanation: 'Spot "discussed about" or "comprises of" (active voice) as instant error markers.',
        },
      ],
      workedExample: {
        problem: 'Fill in: "He is senior _______ me by three years."',
        standardApproach: 'Words ending in "-ior" take "to".',
        cheatCodeApproach: 'Rule: -ior / prefer = ALWAYS "to" (never "than").',
        finalAnswer: 'to',
      },
      commonTraps: [
        'Using "of" after "despite" ("Despite of" is ALWAYS wrong; use "In spite of" or "Despite").',
        'Confusing "die OF" (disease) with "die FROM" (external cause like wound/overwork).',
      ],
      speedTargetNote: 'Target <= 4 seconds using -ior = TO and No-Preposition verb list.',
    },
  },
  {
    id: 'english_cloze_parajumble',
    keywords: ['cloze test', 'sentence rearrangement', 'para jumbles'],
    subject: 'English Comprehension',
    deck: {
      examFocusLabel: 'Bank PO · CAT · TCS · SSC',
      summary: 'Solves Para Jumbles via mandatory pronoun-antecedent pairs and Cloze blanks via grammar + collocation.',
      formulas: [
        {
          name: 'Para Jumble Mandatory Pair Rule',
          formula: '$\\text{Full Noun (Intro)} \\to \\text{Pronoun (He/They/This)} \\to \\text{Contrast (However/But)}$',
          explanation: 'An option starting with "However", "Therefore", or an undefined "He/This" cannot be the opening sentence.',
        },
      ],
      cheatCodes: [
        {
          title: 'Option-First Anchor Elimination (Para Jumbles)',
          shortcut: '$\\text{Find 1 mandatory pair (e.g. B}\\to\\text{D) and scan the 4 MCQ codes instead of ordering all 5 sentences}$',
          explanation: 'Usually only 1 or 2 options preserve the mandatory link pair—saves 20+ seconds!',
        },
        {
          title: 'Cloze Preposition & Tone Lock',
          shortcut: '$\\text{Read 2 words BEFORE and 2 words AFTER the blank first}$',
          explanation: 'Look at article "an", prepositions ("to/from"), and sentence tone before reading the full paragraph.',
        },
      ],
      workedExample: {
        problem: 'Pick opening sentence: (P) However, it failed. (Q) The council launched a new policy in 2020. (R) This led to protests.',
        standardApproach: 'Q introduces policy -> P contrasts outcome -> R states consequence (Q-P-R).',
        cheatCodeApproach: 'Eliminate P ("However") and R ("This") as openers -> only Q can start!',
        finalAnswer: 'Q starts (Q-P-R)',
      },
      commonTraps: [
        'Picking a Cloze word by meaning alone while ignoring the preposition right after the blank.',
        'Starting a Para Jumble with a pronoun/connector when a noun introduction exists.',
      ],
      speedTargetNote: 'Target <= 7 seconds using opener elimination and mandatory pairs.',
    },
  },
  {
    id: 'english_reading_comprehension',
    keywords: ['reading comprehension', 'passage', 'rc', 'critical reading', 'comparative reading', 'main idea', 'inference', 'tone'],
    subject: 'English Comprehension',
    deck: {
      examFocusLabel: 'CAT · UPSC CSAT · Bank PO · Corporate Verbal',
      summary: 'Separates explicitly stated facts from extreme, out-of-scope, or distorted answer choices.',
      formulas: [
        {
          name: 'Passage Structure Map',
          formula: '$\\text{Para 1: Topic/Claim} \\to \\text{Contrast ("But/Yet"): Author’s Real Stance} \\to \\text{Final Lines: Conclusion}$',
          explanation: 'Author attitude and main idea almost always sit right after transition words ("However", "Yet", "Nevertheless").',
        },
      ],
      cheatCodes: [
        {
          title: 'Scope & Extreme Distortion Filter',
          shortcut: '$\\text{Reject options that are (1) Too Narrow, (2) Too Broad, (3) Extreme, or (4) Out of Scope}$',
          explanation: 'The correct main-idea option summarizes the whole passage in balanced, hedged language ("suggests", "often", "primarily").',
        },
      ],
      workedExample: {
        problem: 'Passage mentions urban greenery reduces heat islands slightly while needing maintenance. Which inference is valid?',
        standardApproach: 'Valid inference balances benefit and maintenance constraint without overclaiming.',
        cheatCodeApproach: 'Reject extreme options like "Greenery eliminates all urban heat completely". Pick balanced option.',
        finalAnswer: 'Balanced, hedged statement grounded in passage',
      },
      commonTraps: [
        'Choosing an option that is factually true in real life but NEVER supported by the passage.',
        'Confusing an example in Paragraph 2 with the overall Main Idea.',
      ],
      speedTargetNote: 'Target <= 8 seconds by scanning transition pivots and dropping extremes.',
    },
  },
  {
    id: 'quant_fractions_surds',
    keywords: ['fraction', 'decimal', 'recurring', 'surds', 'indices', 'simplification', 'approximation', 'quick maths'],
    subject: 'Quantitative Aptitude',
    deck: {
      examFocusLabel: 'SSC CGL · Bank Clerk/PO · RRB NTPC · Corporate Quant',
      summary: 'Converts recurring decimals, nested surds, and BODMAS chains into exact fractions in under 5 seconds.',
      formulas: [
        {
          name: 'Recurring Decimal to Fraction Rule',
          formula: '$0.\\overline{ab} = \\frac{ab}{99}, \\qquad 0.a\\overline{bc} = \\frac{abc - a}{990}$',
          explanation: 'Put one 9 per repeating digit and one 0 per non-repeating digit after the decimal point.',
        },
        {
          name: 'Laws of Surds & Rationalization',
          formula: '$\\frac{1}{\\sqrt{a} - \\sqrt{b}} = \\frac{\\sqrt{a} + \\sqrt{b}}{a - b}, \\qquad a^{m/n} = \\sqrt[n]{a^m}$',
          explanation: 'Multiply by conjugate; notice telescoping cancellations in series.',
        },
      ],
      cheatCodes: [
        {
          title: 'Nested Infinite Surd Shortcut',
          shortcut: '$\\sqrt{x + \\sqrt{x + \\sqrt{x + \\dots}}} \\implies \\text{Split } x = n(n+1);\\; + \\text{ takes } n+1,\\; - \\text{ takes } n$',
          explanation: 'Works instantly for consecutive factor products like 6 (2x3), 12 (3x4), 20 (4x5), 42 (6x7).',
        },
        {
          title: 'VBODMAS Left-to-Right Trap Check',
          shortcut: '$\\text{Solve Vinculum } \\bar{\\quad} \\to \\text{Brackets} \\to \\text{Of (before } \\div\\text{)} \\to \\div \\to \\times \\to + \\to -$',
          explanation: '"Of" binds tighter than division: 12 ÷ 3 of 2 = 12 ÷ 6 = 2 (NOT 8).',
        },
      ],
      workedExample: {
        problem: 'Convert $0.2\\overline{36}$ into its lowest fraction.',
        standardApproach: 'Let x = 0.23636...; 1000x - 10x = 234 -> 234/990 = 13/55.',
        cheatCodeApproach: '(236 - 2) / 990 = 234 / 990 -> divide by 18 = 13/55.',
        finalAnswer: '13/55',
      },
      commonTraps: [
        'Evaluating division before "of" in mixed simplification chains.',
        'Dividing recurring digits by 100 instead of 99.',
      ],
      speedTargetNote: 'Target <= 6 seconds using 9/0 denominator pattern and factor splits.',
    },
  },
  {
    id: 'quant_roots_sequences',
    keywords: ['roots', 'arithmetic progression', 'geometric progression', 'sequence', 'series', 'modulus', 'inequalities', 'maximum/minimum', 'functions'],
    subject: 'Quantitative Aptitude',
    deck: {
      examFocusLabel: 'SSC CGL Tier-2 · CAT · Corporate Aptitude',
      summary: 'Master quadratic root symmetry, AP/GP nth terms, and AM-GM bounds without expanding polynomials.',
      formulas: [
        {
          name: 'Quadratic Roots & Discriminant',
          formula: '$\\alpha + \\beta = -\\frac{b}{a},\\; \\alpha\\beta = \\frac{c}{a},\\; D = b^2 - 4ac \\ge 0 \\text{ (Real)}$',
          explanation: 'Use symmetric sums directly instead of solving for individual roots.',
        },
        {
          name: 'AP & GP Closed Forms',
          formula: '$T_n^{\\text{AP}} = a + (n-1)d,\\; S_n^{\\text{AP}} = \\frac{n}{2}(a + l); \\qquad S_\\infty^{\\text{GP}} = \\frac{a}{1-r}\\; (|r|<1)$',
          explanation: 'Middle term of odd-count AP equals the Average = Sum / n.',
        },
      ],
      cheatCodes: [
        {
          title: 'AM >= GM Instant Minimum Trick',
          shortcut: '$a + \\frac{k}{a} \\ge 2\\sqrt{k} \\;\\text{for } a > 0; \\qquad a \\sin\\theta + b \\cos\\theta \\in [-\\sqrt{a^2+b^2}, +\\sqrt{a^2+b^2}]$',
          explanation: 'Solves Maximum/Minimum value MCQs in one mental square root.',
        },
        {
          title: 'Quadratic Sign Flip Check',
          shortcut: '$\\text{Swap } x \\text{ signs: } ax^2 + bx + c = 0 \\text{ has roots } -\\alpha, -\\beta \\text{ when } b \\to -b$',
          explanation: 'In Banking inequalities (x vs y), compare root signs + magnitudes in 4 seconds.',
        },
      ],
      workedExample: {
        problem: 'Find the minimum value of $4x + \\frac{9}{x}$ for $x > 0$.',
        standardApproach: 'Differentiate: 4 - 9/x^2 = 0 -> x = 3/2 -> 6 + 6 = 12.',
        cheatCodeApproach: 'AM >= GM: min = 2 * sqrt(4 * 9) = 2 * 6 = 12!',
        finalAnswer: '12',
      },
      commonTraps: [
        'Forgetting sum of infinite GP requires |r| < 1.',
        'Comparing inequality roots without checking negative sign reversal.',
      ],
      speedTargetNote: 'Target <= 6 seconds via AM-GM and symmetric root identities.',
    },
  },
  {
    id: 'quant_coordinate_geometry',
    keywords: ['distance formula', 'section formula', 'slope', 'coordinate', 'straight line', 'triangle coordinates'],
    subject: 'Quantitative Aptitude',
    deck: {
      examFocusLabel: 'SSC CGL · RRB NTPC · Engineering Placement',
      summary: 'Zero-sketch formulas for slopes, perpendicular lines, internal section splits, and collinearity.',
      formulas: [
        {
          name: 'Distance, Midpoint & Section',
          formula: '$d = \\sqrt{(x_2-x_1)^2 + (y_2-y_1)^2}, \\qquad P = \\left(\\frac{mx_2 + nx_1}{m+n}, \\frac{my_2 + ny_1}{m+n}\\right)$',
          explanation: 'Flip + to - for external division.',
        },
        {
          name: 'Slope & Line Relationships',
          formula: '$m = \\frac{y_2 - y_1}{x_2 - x_1}, \\qquad m_1 = m_2 \\text{ (Parallel)}, \\qquad m_1 m_2 = -1 \\text{ (Perpendicular)}$',
          explanation: 'For ax + by + c = 0, slope is simply -a/b.',
        },
      ],
      cheatCodes: [
        {
          title: '1-Vertex Shift Area Trick',
          shortcut: '$\\text{Shift one vertex to } (0,0) \\implies \\text{Area} = \\frac{1}{2}|x_1^{\\prime} y_2^{\\prime} - x_2^{\\prime} y_1^{\\prime}|$',
          explanation: 'Reduces the 3-term determinant into a single 2x2 cross product.',
        },
      ],
      workedExample: {
        problem: 'Find slope of line perpendicular to $3x - 4y + 7 = 0$.',
        standardApproach: 'Rewrite y = (3/4)x + 7/4 -> m1 = 3/4 -> m2 = -4/3.',
        cheatCodeApproach: 'Swap x, y coefficients & keep sign: perpendicular slope = b/a? Check: (-(-4))/3 = -4/3.',
        finalAnswer: '-4/3',
      },
      commonTraps: [
        'Using m1 * m2 = 1 instead of -1 for perpendicular lines.',
        'Mixing m and n weights in section formula (m goes with second point x2).',
      ],
      speedTargetNote: 'Target <= 7 seconds using origin-shift determinant and -a/b slope rule.',
    },
  },
  {
    id: 'quant_permutation_probability',
    keywords: ['permutation', 'combination', 'probability', 'dice', 'coins', 'cards', 'balls', 'set theory'],
    subject: 'Quantitative Aptitude',
    deck: {
      examFocusLabel: 'IBPS PO · SBI PO · CAT · Corporate Placement',
      summary: 'Complement probability P(at least 1) = 1 - P(none), gap/tie methods, and Venn set cardinalities.',
      formulas: [
        {
          name: 'Counting & Circular Arrangements',
          formula: '$^nP_r = \\frac{n!}{(n-r)!}, \\quad ^nC_r = \\frac{n!}{r!(n-r)!}, \\quad \\text{Circular} = (n-1)!$',
          explanation: 'Necklace/garland clockwise = anticlockwise symmetry divides by 2: (n-1)!/2.',
        },
        {
          name: 'Probability & 2/3-Set Venn Rule',
          formula: '$P(\\text{At least 1}) = 1 - P(\\text{None}), \\qquad n(A\\cup B) = n(A) + n(B) - n(A\\cap B)$',
          explanation: 'Always evaluate "at least one" by subtracting "zero success" from 1.',
        },
      ],
      cheatCodes: [
        {
          title: '2-Dice Sum Triangle Shortcut',
          shortcut: '$\\text{Ways for Sum } S \\in [2,7] = S - 1; \\qquad \\text{Sum } S \\in [7,12] = 13 - S$',
          explanation: 'No need to enumerate 36 pairs! Ways to get sum 9 = 13 - 9 = 4 -> P = 4/36 = 1/9.',
        },
        {
          title: 'Vowels Together / Never Together',
          shortcut: '$\\text{Together} = \\text{Tie as 1 block}; \\qquad \\text{Never Together} = \\text{Gap Method } (c! \\times ^{c+1}P_v)$',
          explanation: 'Remember to divide by factorial of repeated letters!',
        },
      ],
      workedExample: {
        problem: 'Two dice are rolled. Find the probability that the sum is 10.',
        standardApproach: 'List (4,6), (5,5), (6,4) -> 3/36 = 1/12.',
        cheatCodeApproach: '13 - 10 = 3 favorable pairs out of 36 -> 3/36 = 1/12.',
        finalAnswer: '1/12',
      },
      commonTraps: [
        'Forgetting repeated-letter factorials in word permutations (e.g., BANANA = 6! / (3!2!)).',
        'Confusing "at least 2" with "exactly 2".',
      ],
      speedTargetNote: 'Target <= 6 seconds using 13-S dice rule and complement probability.',
    },
  },
  {
    id: 'quant_statistics_qc_ds',
    keywords: ['statistics', 'mean', 'median', 'mode', 'standard deviation', 'range', 'frequency', 'data sufficiency', 'qc', 'quantitative comparison', 'data analysis', 'caselets', 'radar'],
    subject: 'Quantitative Aptitude',
    deck: {
      examFocusLabel: 'SSC Tier-2 · Bank Mains · GRE/Placement',
      summary: 'Instant empirical relation, variance scaling under shifts, and strict sufficiency isolation for DS/QC.',
      formulas: [
        {
          name: 'Empirical Mode Formula & Shift Law',
          formula: '$\\text{Mode} = 3\\,\\text{Median} - 2\\,\\text{Mean}, \\qquad \\text{Var}(ax+b) = a^2 \\text{Var}(x)$',
          explanation: 'Adding a constant +b changes Mean/Median/Mode by +b, but leaves Range & SD unchanged!',
        },
        {
          name: 'Standard Deviation & Variance',
          formula: '$\\sigma = \\sqrt{\\text{Variance}} = \\sqrt{\\frac{\\sum (x_i - \\bar{x})^2}{N}}, \\qquad \\text{CV} = \\frac{\\sigma}{\\bar{x}} \\times 100$',
          explanation: 'Lower Coefficient of Variation (CV) indicates greater consistency.',
        },
      ],
      cheatCodes: [
        {
          title: 'Data Sufficiency Isolation Protocol',
          shortcut: '$\\text{Check I alone (forget II)} \\to \\text{Check II alone (forget I)} \\to \\text{Combine I+II ONLY if both fail}$',
          explanation: 'Never solve for the final numerical value in DS — only prove whether a UNIQUE value exists.',
        },
      ],
      workedExample: {
        problem: 'If Mean = 20 and Median = 22, find the Mode.',
        standardApproach: 'Substitute into Mode = 3(22) - 2(20) = 66 - 40 = 26.',
        cheatCodeApproach: 'Remember 3 Med - 2 Mean = 66 - 40 = 26.',
        finalAnswer: '26',
      },
      commonTraps: [
        'Finding Median before sorting the dataset in ascending order.',
        'Carrying Statement I assumptions mentally when testing Statement II alone.',
      ],
      speedTargetNote: 'Target <= 6 seconds by checking uniqueness rather than solving full arithmetic.',
    },
  },
  {
    id: 'quant_stocks_clocks_misc',
    keywords: ['stock', 'shares', 'measurement', 'business mathematics', 'growth rate', 'number series advanced', 'mathematical', 'calendar', 'clock', 'real-world', 'advanced calculations', 'complex word', 'multi-concept', 'time-bound', 'accuracy techniques', 'problem solving'],
    subject: 'Quantitative Aptitude',
    deck: {
      examFocusLabel: 'SSC · Bank PO · Corporate Commercial Math',
      summary: 'Face Value vs Market Value yield calculation, CAGR intuition, and rapid unit conversions.',
      formulas: [
        {
          name: 'Stock Dividend & Effective Yield',
          formula: '$\\text{Annual Income} = \\text{No. of Shares} \\times \\text{Dividend\\%} \\times \\text{Face Value}, \\quad \\text{Yield\\%} = \\frac{\\text{Income}}{\\text{Market Value}} \\times 100$',
          explanation: 'Dividend is ALWAYS declared on Face Value (par value), while yield is measured on Market Price.',
        },
        {
          name: 'Multi-Period Compound Growth',
          formula: '$V_t = V_0(1 + g)^t \\implies \\text{Rule of 72: Doubling Years} \\approx \\frac{72}{\\text{Rate \\%}}$',
          explanation: 'Rule of 72 estimates exponential doubling speed cleanly in financial MCQs.',
        },
      ],
      cheatCodes: [
        {
          title: 'Better Stock Return Comparison',
          shortcut: '$\\text{Compare } \\frac{\\text{Dividend Rate}}{\\text{Market Price}} \\text{ ratio directly for equal face values}$',
          explanation: 'Skip assuming Rs 1000 investment — simply compare Dividend/Price fractions.',
        },
      ],
      workedExample: {
        problem: 'Find annual yield on a 12% Rs 100 stock quoted at Rs 120.',
        standardApproach: 'Income = Rs 12 on MV = Rs 120 -> 12/120 = 10%.',
        cheatCodeApproach: '12 / 120 = 1/10 = 10% directly.',
        finalAnswer: '10%',
      },
      commonTraps: [
        'Calculating dividend percentage on Market Value instead of Face Value.',
        'Confusing metric prefix shifts (hectare = 10,000 m^2, km/h <-> m/s).',
      ],
      speedTargetNote: 'Target <= 6 seconds by dividing Face Value dividend by Market Price directly.',
    },
  },
  {
    id: 'reasoning_matrices_binary_decisions',
    keywords: ['binary coding', 'matrix coding', 'floor', 'building-based', 'scheduling', 'multiple events', 'group formation', 'selection problems', 'distribution problems', 'decision', 'scenario', 'paradox', 'cause & effect', 'logical consistency', 'course of action', 'inference'],
    subject: 'Reasoning & Intelligence',
    deck: {
      examFocusLabel: 'IBPS PO Mains · SSC CGL · UPSC CSAT',
      summary: 'Deterministic constraint anchoring for floor/scheduling puzzles, binary/matrix codes, and administrative decision flowcharts.',
      formulas: [
        {
          name: 'Matrix & Binary Place Weights',
          formula: '$\\text{Matrix Code: Check Row-First then Column}; \\quad \\text{Binary: } 2^4\\; 2^3\\; 2^2\\; 2^1\\; 2^0 = 16\\; 8\\; 4\\; 2\\; 1$',
          explanation: 'Check the LAST letter of a Matrix Coding word first — options usually differ on the final position.',
        },
        {
          name: 'Puzzles Anchor Law',
          formula: '$\\text{Definite Slot} \\to \\text{Gap Count ("between")} \\to \\text{Negative Rules (cross-out)}$',
          explanation: 'Keep max 2 parallel columns (Case I / Case II); drop broken cases immediately.',
        },
      ],
      cheatCodes: [
        {
          title: 'Binary Parity Check in 2 Seconds',
          shortcut: '$\\text{Odd decimal} \\implies \\text{last bit } = 1; \\quad \\text{Even decimal} \\implies \\text{last bit } = 0$',
          explanation: 'In binary coding problems ($ / * strings), parity eliminates half the options immediately.',
        },
        {
          title: 'Decision-Making Exception Rule',
          shortcut: '$\\text{Main Condition Fails} \\implies \\text{Check Sub-condition (Referral to GM/Chairman) before rejecting}$',
          explanation: 'Most missed marks happen when candidates click "Not Eligible" without checking the escalation clause.',
        },
      ],
      workedExample: {
        problem: 'In binary code where * = 1 and # = 0, what decimal does *#*#* represent?',
        standardApproach: '10101_2 = 16 + 0 + 4 + 0 + 1 = 21.',
        cheatCodeApproach: 'Powers 16 + 4 + 1 = 21 (odd -> ends in *).',
        finalAnswer: '21',
      },
      commonTraps: [
        'Reading Matrix coordinates as Column-Row when instructions specify Row-Column.',
        'Picking an emotional "Course of Action" that creates a bigger new problem.',
      ],
      speedTargetNote: 'Target <= 7 seconds on binary/matrix checks by inspecting the rightmost symbol first.',
    },
  },
  {
    id: 'reasoning_nonverbal_visual',
    keywords: ['mirror', 'water images', 'paper folding', 'paper cutting', 'cube', 'dice', 'counting figures', 'embedded figures', 'dot situation', 'shape rotation', 'figure', 'pattern completion', 'venn diagrams'],
    subject: 'Reasoning & Intelligence',
    deck: {
      examFocusLabel: 'SSC CGL · RRB NTPC · Police SI · Defense',
      summary: 'Left-Right vs Top-Bottom inversion rules, open dice Z-hop opposites, and triangle counting closed formulas.',
      formulas: [
        {
          name: 'Triangle & Square Grid Formulas',
          formula: '$\\text{Partitioned } \\triangle = \\frac{n(n+1)}{2} \\times h; \\quad \\text{8-part Square} = 8 \\times 2 = 16 \\triangle; \\quad \\text{Squares in } n\\times n = \\sum_{k=1}^n k^2$',
          explanation: 'Always double the interior sectors inside a diagonal-crossed square.',
        },
        {
          name: 'Mirror, Water & Unfolded Dice',
          formula: '$\\text{Mirror: Left} \\leftrightarrow \\text{Right (Top fixed)}; \\quad \\text{Water: Top} \\leftrightarrow \\text{Bottom}; \\quad \\text{Open Net: Alternate boxes are opposite}$',
          explanation: 'Two opposite faces of a dice can NEVER appear adjacent in a valid 3D view.',
        },
      ],
      cheatCodes: [
        {
          title: 'Asymmetric Corner Elimination',
          shortcut: '$\\text{Track ONLY ONE asymmetric arrow/letter corner under Mirror/Water/Rotation}$',
          explanation: 'Don’t inspect the full picture — watch how a single top-right hook flips to top-left (mirror) or bottom-right (water).',
        },
        {
          title: 'Paper Folding Reverse Unfold',
          shortcut: '$\\text{Last fold becomes the FIRST mirror line backwards}$',
          explanation: 'Punches near a crease double across that crease as mirror symmetry.',
        },
      ],
      workedExample: {
        problem: 'How many triangles are in an $n=4$ base-divided triangle with 2 horizontal levels?',
        standardApproach: 'Sum 1+2+3+4 = 10 per horizontal layer x 2 = 20.',
        cheatCodeApproach: '4*5/2 * 2 = 20.',
        finalAnswer: '20 triangles',
      },
      commonTraps: [
        'Confusing Horizontal Mirror (acts like Water Image) with Vertical Mirror.',
        'Selecting a folded cube where two opposite net faces touch at an edge.',
      ],
      speedTargetNote: 'Target <= 5 seconds by tracking one corner element or rejecting opposite adjacent faces.',
    },
  },
  {
    id: 'english_parts_of_speech_syntax',
    keywords: ['noun', 'pronoun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction', 'interjection', 'article', 'determiner', 'question tag', 'modal', 'conditional', 'parallelism', 'modifier', 'redundancy', 'ambiguity', 'clause', 'sentence'],
    subject: 'English Comprehension',
    deck: {
      examFocusLabel: 'SSC CGL · CDS · Bank PO · Corporate Verbal',
      summary: 'High-frequency grammar invariants: parallel structures, dangling modifiers, question tag polarity, and zero-redundancy rules.',
      formulas: [
        {
          name: 'Parallelism & Correlative Pairs',
          formula: '$\\text{Neither...nor, Either...or, Not only...but also} \\implies \\text{Same grammatical form on BOTH sides}$',
          explanation: '"Not only he won" (wrong order if paired with "but also") -> place "not only" right before the parallel verb/noun.',
        },
        {
          name: 'Question Tags & Uncountable Nouns',
          formula: '$\\text{Positive Statement} \\to \\text{Negative Tag}; \\; \\text{Hardly/Seldom/Scarcely} \\to \\text{Positive Tag!}$',
          explanation: 'Uncountables (Furniture, Advice, Information, Luggage, Scenery, Equipment) NEVER take plural -s or "a/an".',
        },
      ],
      cheatCodes: [
        {
          title: 'Dangling Modifier Instant Fix',
          shortcut: '$\\text{Introductory participle ("Walking down the street, ...")} \\implies \\text{True DOER must be the VERY FIRST word after comma}$',
          explanation: '"Walking down the park, a snake bit him" makes the snake do the walking — wrong!',
        },
        {
          title: 'Redundancy Killer List',
          shortcut: '$\\text{Drop: return back, revert back, cousin brother, repeat again, final conclusion, mutual friend}$',
          explanation: 'SPOT these paired words immediately in Error Spotting.',
        },
      ],
      workedExample: {
        problem: 'Spot error: "Hardly had he arrived when it started raining, isn’t it?"',
        standardApproach: 'Hardly carries negative polarity -> tag must be positive and match "had he" -> "had he?".',
        cheatCodeApproach: 'Negative adverb "Hardly" -> positive tag; inversion "had he" -> "had he?" (not isn’t it).',
        finalAnswer: 'Replace "isn’t it" with "had he?"',
      },
      commonTraps: [
        'Using plural verbs with "Each of / Every / One of + Plural Noun" (takes SINGULAR verb).',
        'Following "Less" with countable nouns (use "Fewer" for countables, "Less" for quantities).',
      ],
      speedTargetNote: 'Target <= 6 seconds using pair alignment and redundancy word triggers.',
    },
  },
  {
    id: 'english_vocab_advanced',
    keywords: ['phrasal', 'foreign words', 'homophone', 'homonym', 'confusable', 'spelling', 'punctuation', 'para completion', 'connectors', 'word usage', 'word analogies'],
    subject: 'English Comprehension',
    deck: {
      examFocusLabel: 'SSC CGL · Bank Mains · CLAT · Corporate Verbal',
      summary: 'Pair-confusable distinctions (affect/effect, stationery/stationary), connector polarity, and prefix spelling tricks.',
      formulas: [
        {
          name: 'High-Frequency Confusable Pairs',
          formula: '$\\text{Affect (Verb) vs Effect (Noun); Complement (Complete) vs Compliment (Praise); Stationary (Still) vs Stationery (Paper)}$',
          explanation: 'Memory hook: "E" in stationEry = Envelopes/Pens; "A" in stationAry = At rest.',
        },
        {
          name: 'Connector Logic Matrix',
          formula: '$\\text{Contrast: Although/However/Whereas} \\quad|\\quad \\text{Cause: Because/Since/Owing to} \\quad|\\quad \\text{Result: Consequently/Hence}$',
          explanation: '"Although" NEVER pairs with "but" — use a comma or "yet".',
        },
      ],
      cheatCodes: [
        {
          title: 'Root & Spelling Double-Letter Check',
          shortcut: '$\\text{Q-U always; I before E except after C; double cons in Accommodation, Committee, Occurrence, Millennium}$',
          explanation: 'Inspect suffix joins (-ment, -able, -ious) directly on the two most similar choices.',
        },
      ],
      workedExample: {
        problem: 'Choose correctly: "The new policy will ____ positive changes." (affect / effect)',
        standardApproach: '"Effect" as a verb means "to bring about/cause".',
        cheatCodeApproach: 'Note: affect = influence; effect = bring about / result.',
        finalAnswer: 'effect (or contextual verb)',
      },
      commonTraps: [
        'Using "principle" (rule) instead of "principal" (chief / school head / money sum).',
        'Pairing "Despite" with "of" ("Despite of" is ALWAYS wrong; use "In spite of" or "Despite").',
      ],
      speedTargetNote: 'Target <= 5 seconds using confusable memory hooks and preposition checks.',
    },
  },
  {
    id: 'ga_disaster_environment_geo',
    keywords: ['disaster', 'mitigation', 'ecosystem', 'biodiversity', 'climate', 'pollution', 'continent', 'ocean', 'landform', 'soil', 'vegetation', 'universe', 'weather'],
    subject: 'General Awareness',
    deck: {
      examFocusLabel: 'UPSC Prelims · SSC · State PSC · Geography/Env',
      summary: 'NDMA disaster framework, global climate protocols, soil/forest strata, and ocean current thermal rules.',
      formulas: [
        {
          name: 'India Disaster Management Hierarchy',
          formula: '$\\text{NDMA Act 2005} \\to \\text{NDMA Chaired by PM} \\to \\text{SDMA (CM)} \\to \\text{DDMA (District Magistrate)}$',
          explanation: 'NDRF operates under NDMA for specialized disaster response across states.',
        },
        {
          name: 'Environment Treaties Ladder',
          formula: '$\\text{Ramsar 1971 (Wetlands)} \\to \\text{Montreal 1987 (Ozone/CFC)} \\to \\text{Kyoto 1997 (GHG)} \\to \\text{Paris 2015 (1.5–2°C)}$',
          explanation: 'Sendai Framework (2015–2030) governs Disaster Risk Reduction globally.',
        },
      ],
      cheatCodes: [
        {
          title: 'Ocean Currents & Soil Mnemonic',
          shortcut: '$\\text{Equator} \\to \\text{Poles = Warm Current}; \\quad \\text{Poles} \\to \\text{Equator = Cold Current (Humboldt, Benguela, Labrador)}$',
          explanation: 'Cold currents along western subtropical coasts create coastal deserts (Atacama, Namib).',
        },
      ],
      workedExample: {
        problem: 'Who is the ex-officio Chairperson of India’s National Disaster Management Authority (NDMA)?',
        standardApproach: 'Under Section 3 of the Disaster Management Act 2005, the Prime Minister chairs NDMA.',
        cheatCodeApproach: 'NDMA = PM, SDMA = CM, DDMA = District Collector/DM.',
        finalAnswer: 'Prime Minister of India',
      },
      commonTraps: [
        'Confusing Montreal Protocol (Ozone-depleting substances) with Kyoto/Paris (Greenhouse gases).',
        'Placing NDMA under Home Minister instead of Prime Minister as Chairperson.',
      ],
      speedTargetNote: 'Target <= 5 seconds via treaty timeline and NDMA/SDMA/DDMA hierarchy.',
    },
  },
  {
    id: 'ga_computers_tech',
    keywords: ['computer', 'hardware', 'software', 'operating system', 'memory', 'storage', 'network', 'internet', 'database', 'programming', 'cyber security', 'information technology', 'communication technology', 'biotechnology', 'defense', 'space'],
    subject: 'General Awareness',
    deck: {
      examFocusLabel: 'SSC CGL Mains · IBPS RRB · NIELIT · State PSC',
      summary: 'Memory speed/volatility pyramid, OSI 7 layers, DBMS ACID keys, and cyber-defense fundamentals.',
      formulas: [
        {
          name: 'Memory Speed & Hierarchy Pyramid',
          formula: '$\\text{Fastest/Smallest: CPU Registers} \\to \\text{Cache (SRAM)} \\to \\text{RAM (DRAM)} \\to \\text{SSD/HDD (Non-volatile)}$',
          explanation: 'SRAM is used for Cache (faster, no refresh); DRAM is Main RAM (needs periodic refresh).',
        },
        {
          name: 'OSI 7-Layer Stack & Storage Units',
          formula: '$\\text{Please Do Not Throw Sausage Pizza Away} = \\text{Physical, Data Link, Network, Transport, Session, Presentation, Application}$',
          explanation: '1 Nibble = 4 bits, 1 Byte = 8 bits, 1 KB = 1024 Bytes; Router = Network Layer (L3), Switch = Data Link (L2).',
        },
      ],
      cheatCodes: [
        {
          title: 'HTTP/HTTPS/FTP/SMTP Ports Hook',
          shortcut: '$\\text{HTTP: 80, HTTPS: 443, FTP: 20/21, SSH: 22, SMTP: 25 (Send Mail), DNS: 53}$',
          explanation: 'Phishing (fake email link), Ransomware (encrypts files for extortion), Firewall (filters packet traffic).',
        },
      ],
      workedExample: {
        problem: 'Which memory is volatile AND fastest among L1 Cache, DRAM, SSD, and ROM?',
        standardApproach: 'ROM/SSD are non-volatile; L1 Cache (SRAM) sits inside CPU and is far faster than DRAM.',
        cheatCodeApproach: 'Hierarchy top rule: Registers > Cache (SRAM) > Main RAM (DRAM).',
        finalAnswer: 'L1 Cache',
      },
      commonTraps: [
        'Thinking ROM is volatile (ROM is NON-volatile; RAM is volatile).',
        'Confusing Primary Key (unique + NOT NULL) with Foreign Key (references another table).',
      ],
      speedTargetNote: 'Target <= 5 seconds via OSI mnemonic and memory pyramid order.',
    },
  },
  {
    id: 'ga_economy_markets_insurance',
    keywords: ['microeconomics', 'macroeconomics', 'inflation', 'deflation', 'international trade', 'planning in india', 'economic reforms', 'poverty', 'unemployment', 'capital market', 'money market', 'stock exchange', 'mutual fund', 'insurance', 'union budget', 'economic survey', 'public finance', 'agriculture sector', 'industry sector', 'service sector', 'financial regulators', 'fiscal policy', 'national income'],
    subject: 'General Awareness',
    deck: {
      examFocusLabel: 'IBPS PO · RBI Grade B · UPSC · SSC Economics',
      summary: 'Money vs Capital markets, regulator grid (RBI/SEBI/IRDAI/PFRDA), inflation types, and Union Budget deficit identities.',
      formulas: [
        {
          name: 'Indian Financial Regulator Grid',
          formula: '$\\text{Banks/NBFC/Money Market} \\to \\text{RBI};\\; \\text{Stocks/Mutual Funds} \\to \\text{SEBI};\\; \\text{Insurance} \\to \\text{IRDAI};\\; \\text{Pension} \\to \\text{PFRDA}$',
          explanation: 'Money Market deals in short-term (<1 yr: T-Bills, CP, CD, Call Money); Capital Market deals in >1 yr equity/bonds.',
        },
        {
          name: 'Budget Deficit Identities',
          formula: '$\\text{Fiscal Deficit} = \\text{Total Exp} - (\\text{Rev Receipts} + \\text{Non-Debt Cap Receipts});\\; \\text{Primary Deficit} = \\text{Fiscal Deficit} - \\text{Interest Paid}$',
          explanation: 'Zero Primary Deficit means all current borrowing goes solely toward servicing past debt interest.',
        },
      ],
      cheatCodes: [
        {
          title: 'Stagflation & Phillips Curve Quick Trigger',
          shortcut: '$\\text{Stagflation} = \\text{Stagnant Growth (High Unemployment)} + \\text{High Inflation}$',
          explanation: 'Elasticity of necessities < 1; Demand-Pull = too much money chasing too few goods; Cost-Push = wage/fuel spike.',
        },
      ],
      workedExample: {
        problem: 'If Fiscal Deficit is Rs 18 Lakh Cr and Interest Payments are Rs 10 Lakh Cr, find Primary Deficit.',
        standardApproach: 'Primary Deficit = Fiscal Deficit - Interest Payments = 18 - 10 = Rs 8 Lakh Cr.',
        cheatCodeApproach: 'Subtract Interest directly -> 18 - 10 = 8.',
        finalAnswer: 'Rs 8 Lakh Crore',
      },
      commonTraps: [
        'Classifying Treasury Bills (91/182/364 days) under Capital Market instead of Money Market.',
        'Forgetting that 1991 LPG Reforms opened Liberalization, Privatization, Globalization.',
      ],
      speedTargetNote: 'Target <= 5 seconds via regulator mapping and deficit subtraction.',
    },
  },
  {
    id: 'ga_intl_awards_sports_schemes',
    keywords: ['international org', 'world politics', 'foreign policy', 'bilateral', 'global issues', 'awards', 'sports', 'tournament', 'player achievements', 'schemes', 'government initiatives', 'current affairs', 'important days', 'books & authors', 'personalities', 'cultural events', 'education system', 'health & family', 'rural development', 'urban development'],
    subject: 'General Awareness',
    deck: {
      examFocusLabel: 'SSC · RRB · Banking GK · State PSC Current',
      summary: 'UN/Global HQ clusters, flagship welfare launch years, sports trophies, and Constitutional awards hierarchy.',
      formulas: [
        {
          name: 'HQ City Clustering Shortcut',
          formula: '$\\text{Geneva: WHO, WTO, ILO, WIPO} \\;|\\; \\text{Vienna: IAEA, OPEC} \\;|\\; \\text{Paris: UNESCO, OECD, FATF} \\;|\\; \\text{Rome: FAO, WFP}$',
          explanation: 'Remember: UN HQ/UNICEF/UNDP = New York; IMF & World Bank = Washington D.C.',
        },
        {
          name: 'Civilian & Sports Award Ladder',
          formula: '$\\text{Civilian: Bharat Ratna} > \\text{Padma Vibhushan} > \\text{Padma Bhushan} > \\text{Padma Shri};\\; \\text{Sports: Major Dhyan Chand Khel Ratna}$',
          explanation: 'Arjuna Award honors 4 years of consistent performance; Dronacharya honors coaches.',
        },
      ],
      cheatCodes: [
        {
          title: 'Organization Theme Trigger',
          shortcut: '$\\text{Food/Hunger} \\to \\text{Rome (FAO/WFP)};\\; \\text{Atomic/Oil} \\to \\text{Vienna (IAEA/OPEC)};\\; \\text{Finance} \\to \\text{Washington D.C.}$',
          explanation: 'Instant HQ recall even when full acronym expansion is unfamiliar.',
        },
      ],
      workedExample: {
        problem: 'Where is the headquarters of both the Food & Agriculture Organization (FAO) and World Food Programme (WFP)?',
        standardApproach: 'Both UN food agencies are headquartered in Rome, Italy.',
        cheatCodeApproach: 'Food agencies = Rome (FAO, WFP, IFAD).',
        finalAnswer: 'Rome, Italy',
      },
      commonTraps: [
        'Mixing up UNESCO (Paris) with UNICEF (New York).',
        'Swapping Padma Bhushan (3rd highest) and Padma Vibhushan (2nd highest).',
      ],
      speedTargetNote: 'Target <= 4 seconds via thematic HQ city clustering.',
    },
  },
];

function createGenericSubjectDeck(topicTitle: string, subject: SubjectTag, examCategories: string[]): TopicSlideDeck {
  const focus = examCategories.length > 0 ? examCategories.slice(0, 4).join(' · ') : 'SSC · Banking · RRB · Corporate Aptitude';

  if (subject === 'Quantitative Aptitude') {
    return {
      topicKey: `generic_quant`,
      topicTitle,
      subject,
      examFocusLabel: focus,
      summary: 'High-speed quantitative calculation framework combining percentage-fraction conversions, ratio balancing, and option elimination.',
      formulas: [
        {
          name: 'Percentage-Fraction & Successive Change',
          formula: '$\\text{Net \\%} = a + b + \\frac{ab}{100}, \\qquad 16\\frac{2}{3}\\% = \\frac{1}{6},\\; 12.5\\% = \\frac{1}{8}$',
          explanation: 'Convert messy percentages into clean integer fractions before multiplying.',
        },
        {
          name: 'Harmonic Speed & Ratio Balance',
          formula: '$v_{\\text{avg}} = \\frac{2v_1 v_2}{v_1 + v_2}, \\qquad \\frac{Q_1}{Q_2} = \\frac{C_2 - C_{\\text{mean}}}{C_{\\text{mean}} - C_1}$',
          explanation: 'Applies harmonic averages and cross-alligation in 5 seconds without algebra.',
        },
      ],
      cheatCodes: [
        {
          title: 'Unit Digit & Digital Root Elimination',
          shortcut: '$\\text{Check last digit first} \\to \\text{then check divisibility by } 3, 9, \\text{ or } 11$',
          explanation: 'In MCQ speed tests, 2 to 3 options usually fail unit-digit or divisibility checks before full calculation.',
        },
        {
          title: 'Option Back-Substitution',
          shortcut: '$\\text{Test the middle option (B or C) directly into the problem condition}$',
          explanation: 'Avoids quadratic or multi-variable setup on word problems.',
        },
      ],
      workedExample: {
        problem: 'A quantity increases by $20\\%$ and then decreases by $20\\%$. Find the net percentage change.',
        standardApproach: '$100 \\to 120 \\to 120 \\times 0.8 = 96 \\implies -4\\%$.',
        cheatCodeApproach: 'Equal $+x\\%$ and $-x\\%$ ALWAYS gives $-x^2/100 = -(20^2)/100 = -4\\%$.',
        finalAnswer: '4% decrease',
      },
      commonTraps: [
        'Forgetting negative signs inside successive change formulas.',
        'Computing all digits when the unit digit already uniquely identifies one MCQ choice.',
      ],
      speedTargetNote: 'Target <= 6 seconds via unit-digit filtering and fraction ratios.',
    };
  }

  if (subject === 'Reasoning & Intelligence') {
    return {
      topicKey: 'generic_reasoning',
      topicTitle,
      subject,
      examFocusLabel: focus,
      summary: 'Rapid pattern-recognition shortcuts for series, coding, logic deductions, and spatial puzzles.',
      formulas: [
        {
          name: 'Alphabet Anchor & Clock Formula',
          formula: '$\\text{EJOTY } (5,10,15,20,25), \\quad \\text{Opposite Sum} = 27, \\quad \\theta = |30H - 5.5M|$',
          explanation: 'Anchors letter shifts and clock angles without counting on fingers.',
        },
      ],
      cheatCodes: [
        {
          title: 'Partial Character / Gender Filtering',
          shortcut: '$\\text{Check ONLY differing character indices or target gender across options}$',
          explanation: 'Stops wasted full-word decoding when Option A–D diverge on a single slot.',
        },
        {
          title: 'Vector & Turn Cancellation',
          shortcut: '$1\\text{ Left} + 1\\text{ Right} = 0,\\quad \\Delta N\\text{-}S \\text{ & } \\Delta E\\text{-}W \\to \\text{Pythagorean Triplet}$',
          explanation: 'Eliminates multi-step path sketching.',
        },
      ],
      workedExample: {
        problem: 'Find the opposite of letter K in standard reverse pairing.',
        standardApproach: 'K is 11th from start -> 11th from end is $27 - 11 = 16$th = P.',
        cheatCodeApproach: 'Pair sum 27 ("KP" / "KanPur") -> P in 2 seconds.',
        finalAnswer: 'P',
      },
      commonTraps: [
        'Assuming gender from names in blood relations.',
        'Forgetting Either-Or complementary rules in syllogisms.',
      ],
      speedTargetNote: 'Target <= 6 seconds via partial-slot filtering.',
    };
  }

  if (subject === 'English Comprehension') {
    return {
      topicKey: 'generic_english',
      topicTitle,
      subject,
      examFocusLabel: focus,
      summary: 'Grammar, voice/narration, and vocabulary precision tactics built for 10-second verbal MCQs.',
      formulas: [
        {
          name: 'Subject Headword & Auxiliary Lock',
          formula: '$\\text{Strip prepositional phrases ("of / along with") before matching singular/plural verb}$',
          explanation: 'Keeps subject-verb agreement 100% accurate on multi-clause sentences.',
        },
      ],
      cheatCodes: [
        {
          title: 'Helping-Verb & Polarity Scan',
          shortcut: '$\\text{Match auxiliary verb in Voice/Narration; match +/- tone polarity in Vocab}$',
          explanation: 'Resolves most verbal questions in 4 seconds without re-reading every word.',
        },
      ],
      workedExample: {
        problem: 'Choose the right verb: "Neither the coach nor the players (was / were) ready."',
        standardApproach: 'Proximity rule with "neither...nor": verb agrees with nearest subject ("players" -> plural).',
        cheatCodeApproach: 'Look ONLY at the noun right after "nor" ("players") -> "were".',
        finalAnswer: 'were',
      },
      commonTraps: [
        'Changing tense inside Active-Passive voice (only Narration backshifts tense).',
        'Choosing literal definitions for figurative idioms.',
      ],
      speedTargetNote: 'Target <= 5 seconds via auxiliary and polarity scanning.',
    };
  }

  return {
    topicKey: 'generic_ga',
    topicTitle,
    subject,
    examFocusLabel: focus,
    summary: 'High-retention constitutional, economic, scientific, and historical memory anchors for rapid GK recall.',
    formulas: [
      {
        name: 'Constitutional & Economic Anchors',
        formula: '$\\text{Art. 32/226 (Writs)} \\; | \\; \\text{Art. 110 (Money Bill)} \\; | \\; \\text{CRR/SLR/Repo} \\uparrow \\implies \\text{Liquidity} \\downarrow$',
        explanation: 'Connects key articles and RBI monetary triggers cleanly.',
      },
    ],
    cheatCodes: [
      {
        title: 'Timeline & Mnemonic Elimination',
        shortcut: '$\\text{TEARS OF OLD PM (12 Schedules)} \\; | \\; \\text{B-H-A-J-S-A (Mughals)} \\; | \\; \\text{KEDA (Fat-Soluble Vitamins)}$',
        explanation: 'Eliminate out-of-era or wrong-category options even when a fact feels partially familiar.',
      },
    ],
    workedExample: {
      problem: 'Which RBI action tightens surplus liquidity to curb inflation?',
      standardApproach: 'Raising Repo Rate or CRR makes bank borrowing costlier and reduces credit supply.',
      cheatCodeApproach: 'Rule: Policy Rate UP -> Money Supply DOWN.',
      finalAnswer: 'Raising Repo Rate / CRR',
    },
    commonTraps: [
      'Guessing blindly on unfamiliar static dates (remember $-0.25$ negative marking per wrong guess!).',
    ],
    speedTargetNote: 'Target <= 4 seconds; skip uncertain factual guesses to protect net score.',
  };
}

/**
 * Resolves a tailored Formula & Cheat-Code Slide Deck for today's official test topic
 * across all 37 syllabus modules, weekly revision/assessment days, or custom admin topics.
 */
export function getTopicFormulaSlides(
  todayTopic?: StudyPlanDay | null,
  todayTest?: Pick<TestPaper, 'title' | 'description' | 'category'> | null
): TopicSlideDeck {
  const rawTopic = (todayTopic?.topic || todayTest?.title || 'Competitive Exam Speed Formulas')
    .replace(/\s*\(Tier \d+ Mastery\)/gi, '')
    .trim();
  const subject: SubjectTag = todayTopic?.subject || 'Quantitative Aptitude';
  const topicLower = rawTopic.toLowerCase();
  const searchCorpus = `${topicLower} ${todayTopic?.topicDescription || ''} ${todayTest?.description || ''}`.toLowerCase();

  // Prioritize matches in the primary topic title before checking secondary descriptions
  const matchedSeed =
    TOPIC_DECK_SEEDS.find(
      (seed) =>
        seed.subject === subject &&
        seed.keywords.some((kw) => topicLower.includes(kw))
    ) ||
    TOPIC_DECK_SEEDS.find((seed) => seed.keywords.some((kw) => topicLower.includes(kw))) ||
    TOPIC_DECK_SEEDS.find(
      (seed) =>
        seed.subject === subject &&
        seed.keywords.some((kw) => searchCorpus.includes(kw))
    ) ||
    TOPIC_DECK_SEEDS.find((seed) => seed.keywords.some((kw) => searchCorpus.includes(kw)));

  if (matchedSeed) {
    const categories = todayTopic?.recommendedExamCategories?.length
      ? todayTopic.recommendedExamCategories
      : [];
    return {
      topicKey: matchedSeed.id,
      topicTitle: rawTopic,
      subject: todayTopic?.subject || matchedSeed.subject,
      ...matchedSeed.deck,
      examFocusLabel:
        categories.length > 0
          ? `${categories.slice(0, 3).join(' · ')} · Corporate Aptitude`
          : matchedSeed.deck.examFocusLabel,
    };
  }

  return createGenericSubjectDeck(
    rawTopic,
    subject,
    todayTopic?.recommendedExamCategories || (todayTest?.category ? [todayTest.category] : [])
  );
}
