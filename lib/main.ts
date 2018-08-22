
import { AnalyzerFactory } from './analysis/analyzer/analyzer_factory';
import { GlobalVariablesStrategy } from './analysis/strategies/global_variables/global_variables_strategy';
import { ReportFactory, ReportMode } from './analysis/reports/report_factory';


function printHeader(filePath) {
    console.log('# ******* Processing ' + filePath + ' *******');
}


async function main(analyzerFactory: AnalyzerFactory, reportFactory: ReportFactory) {

    if (process.argv.length >= 3) {

        let filePath = process.argv[2];
        printHeader(filePath);

        let analyzer = analyzerFactory.createAnalyzer(filePath, [new GlobalVariablesStrategy()]);
        await analyzer.run();
        let result = analyzer.getResult();
        let reporter = reportFactory.createReporter(result, ReportMode.console);
        reporter.run();

    }
    else {
        throw new Error('>>> Psss!! you need to specify a directory to analyze');
    }
}


main(new AnalyzerFactory(), new ReportFactory())
    .catch(error => {
        console.error('got error', error);
    })





