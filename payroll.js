/*
 Payroll & Income Tax Calculator - JavaScript (PROCEDURAL), console version

 Run:  node payroll.js

 Procedural = no classes. The program is a list of simple functions that run
 one after another, top to bottom:

    main()  ->  askName() / askType() / askSalary()   (get the input)
            ->  computePayroll()                      (do the computation)
                   |- computeSss() or computeGsis()
                   |- computePhilhealth()
                   |- computePagibig()
                   |- computeAnnualTax()
            ->  makeReport()                          (turn the result into text)
            ->  console.log()                         (show it on screen)

 Same inputs and same output text as the Python version.
*/
const readline = require("readline/promises");

// ===== DATA =====
// BIR yearly tax table (TRAIN law): [income above, base tax, rate on the extra]
const TAX_TABLE = [
  [0, 0, 0],
  [250000, 0, 0.15],
  [400000, 22500, 0.2],
  [800000, 102500, 0.25],
  [2000000, 402500, 0.3],
  [8000000, 2202500, 0.35],
];

// ===== HELPERS =====
function round2(x) {
  return Math.floor(x * 100 + 0.5) / 100; // round to centavos
}

function clamp(x, low, high) {
  return Math.min(Math.max(x, low), high); // keep x between low and high
}

function money(x) {
  return x.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ===== STEP 1: ONE FUNCTION FOR EACH DEDUCTION =====
function computeSss(salary) { // private employees
  const salaryCredit = clamp(Math.floor(salary / 500 + 0.5) * 500, 5000, 35000);
  return round2(salaryCredit * 0.05);
}

function computeGsis(salary) { // government employees: 9% of salary
  return round2(salary * 0.09);
}

function computePhilhealth(salary) {
  // 5% of salary (between 10,000 and 100,000), split half-half with the employer
  return round2((clamp(salary, 10000, 100000) * 0.05) / 2);
}

function computePagibig(salary) {
  // 2% of salary (1% if 1,500 or less); only the first 10,000 of salary counts
  const rate = salary <= 1500 ? 0.01 : 0.02;
  return round2(Math.min(salary, 10000) * rate);
}

function computeAnnualTax(annualIncome) {
  for (let i = TAX_TABLE.length - 1; i >= 0; i--) { // check the highest bracket first
    const [above, base, rate] = TAX_TABLE[i];
    if (annualIncome > above) return base + (annualIncome - above) * rate;
  }
  return 0;
}

// ===== STEP 2: PUT EVERYTHING TOGETHER =====
function computePayroll(name, empType, salary) {
  // Pick the retirement fund by employee type
  const items = [];
  if (empType === "Government") {
    items.push(["GSIS", computeGsis(salary)]);
  } else {
    items.push(["SSS", computeSss(salary)]);
  }
  items.push(["PhilHealth", computePhilhealth(salary)]);
  items.push(["Pag-IBIG", computePagibig(salary)]);

  let contributions = 0;
  for (const [label, amount] of items) { // add them up with a loop
    contributions += amount;
  }
  contributions = round2(contributions);

  const taxable = round2(salary - contributions); // tax is computed AFTER the contributions
  const annualTax = round2(computeAnnualTax(round2(taxable * 12)));
  const tax = round2(annualTax / 12);
  const totalDeductions = round2(contributions + tax);

  return {
    name, type: empType, gross: salary, items, contributions, taxable, tax,
    totalDeductions, net: round2(salary - totalDeductions), annualTax,
  };
}

// ===== STEP 3: TURN THE RESULT INTO TEXT =====
function line(label, value) {
  return label.padEnd(26) + money(value).padStart(14);
}

function makeReport(r) {
  const lines = [
    `Employee : ${r.name} (${r.type})`,
    "Amounts  : Philippine Peso (PHP)",
    "-".repeat(40),
    line("Gross monthly pay", r.gross),
  ];
  for (const [label, amount] of r.items) {
    lines.push(line("  " + label, amount));
  }
  lines.push(line("Total contributions", r.contributions));
  lines.push(line("Taxable income", r.taxable));
  lines.push(line("Withholding tax", r.tax));
  lines.push(line("Total deductions", r.totalDeductions));
  lines.push("-".repeat(40));
  lines.push(line("NET PAY", r.net));
  lines.push(line("Annual income tax", r.annualTax));
  return lines.join("\n");
}

// ===== STEP 4: GET THE INPUT (each function keeps asking until the answer is valid) =====
async function askName(rl) {
  while (true) {
    const name = (await rl.question("Employee name: ")).trim();
    if (name !== "") return name;
    console.log("  Please enter the employee name.");
  }
}

async function askType(rl) {
  while (true) {
    const answer = (await rl.question("Employee type (1 = Private, 2 = Government): ")).trim();
    if (answer === "1") return "Private";
    if (answer === "2") return "Government";
    console.log("  Please type 1 or 2.");
  }
}

async function askSalary(rl) {
  while (true) {
    const salary = Number((await rl.question("Monthly basic salary (PHP): ")).replace(/,/g, "").trim());
    if (Number.isFinite(salary) && salary > 0) return salary;
    console.log("  Monthly salary must be a number greater than 0.");
  }
}

// ===== STEP 5: THE MAIN PROGRAM =====
async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log("=== PAYROLL & INCOME TAX CALCULATOR (JavaScript / Procedural) ===");

  let again = "y";
  while (again === "y") {
    const name = await askName(rl);
    const empType = await askType(rl);
    const salary = await askSalary(rl);

    const result = computePayroll(name, empType, salary);
    console.log("\n" + makeReport(result) + "\n");

    again = (await rl.question("Compute another employee? (y/n): ")).trim().toLowerCase();
    console.log("");
  }
  console.log("Goodbye.");
  rl.close();
}

// ===== START =====
if (require.main === module) {
  main(); // started with: node payroll.js
} else {
  module.exports = { computePayroll, makeReport }; // lets another file reuse the functions
}
