
import { AnalyzerFactory, AnalysisOptions } from './analysis/analyzer/analyzer_factory';
import { GlobalVariablesStrategy } from './analysis/strategies/global_variables/global_variables_strategy';
import { ReportFactory, ReportMode } from './analysis/reports/report_factory';
import * as program from 'commander';

function printHeader(analysisOptions: AnalysisOptions) {

    console.log('# *************** Processing ' + analysisOptions.input + ' ***************');
    console.log('#    - output report %j', program.output);
    console.log('#    - report mode %j', program.reportMode);
    console.log('#    - omitting %j', program.omit);

}


async function main(analyzerFactory: AnalyzerFactory, reportFactory: ReportFactory, analysisOptions: AnalysisOptions) {

    printHeader(analysisOptions);

    let analyzer = analyzerFactory.createAnalyzer(analysisOptions.input, [new GlobalVariablesStrategy()]);
    await analyzer.run();
    let result = analyzer.getResult();
    let reporter = reportFactory.createReporter(result, ReportMode[analysisOptions.reportMode]);
    reporter.run();

}

function toStr(val) {
    return val.toString();
}

function list(val) {
    return val.split(',');
}

function requireOptions(analysisOptions: AnalysisOptions) {

    if (!program.input) {
        throw new Error('>>> Psss!! you need to specify a directory to analyze');
    }

    if (!ReportMode[analysisOptions.reportMode]) {
        throw new Error('>>> Psss!! you need to specify a valid report mode, \"' + analysisOptions.reportMode + '\" is not a valid one');
    }

}

program
    .version('0.1.0', '-v, --version')
    .option('-i, --input <path>', 'path of file or directory to analyze (ex. C:/projects/script.js)')
    .option('-o, --output <filePath>', 'output file to store the report (ex. globals_catch.yml)', 'globals_catch.yml')
    .option('-r, --report-mode <mode>', 'Set report mode (ex. console)', 'console')
    .option('-m, --omit <path>', 'Omit files or directories', list)
    .parse(process.argv);

let analysisOptions: AnalysisOptions = {
    input: program.input,
    output: program.output,
    reportMode: program.reportMode,
    omit: program.omit
}

requireOptions(analysisOptions);

main(new AnalyzerFactory(), new ReportFactory(), analysisOptions)
    .catch(error => {
        console.error('got error', error);
    })





