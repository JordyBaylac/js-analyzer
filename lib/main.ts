
import { AnalyzerFactory } from './analysis/analyzer/analyzer_factory';
import { GlobalVariablesStrategy } from './analysis/strategies/global_variables/global_variables_strategy';


function printHeader(filePath) {
    console.log('******* Processing ' + filePath + ' *******');
}


async function main(factory: AnalyzerFactory) {

    if (process.argv.length >= 3) {

        let filePath = process.argv[2];
        printHeader(filePath);

        let analyzer = factory.createAnalyzer(filePath, [new GlobalVariablesStrategy()]);
        await analyzer.run();

    }
    else {
        throw new Error('>>> Psss!! you need to specify a directory to parse');
    }
}

/**
 * check    https://github.com/jprichardson/node-klaw
 *  and     https://ourcodeworld.com/articles/read/420/how-to-read-recursively-a-directory-in-node-js
 */
main(new AnalyzerFactory())
    .catch(error => {
        console.error('got error', error);
    })





