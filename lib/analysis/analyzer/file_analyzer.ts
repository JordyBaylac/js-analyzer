import { IStrategy } from '../strategies/i_strategy';
import * as esprima from 'esprima';
import * as fs from 'fs';
import * as path from 'path';

export class FileAnalyzer {

    private fileToProcess: string;
    private strategies: IStrategy[];

    constructor(filePath: string, strategies: IStrategy[]) {
        this.fileToProcess = filePath;
        this.strategies = strategies || [];
    }

    getStrategiesDescription() {
        return '[' + this.strategies.map(s => s.constructor.name).join(',') + ']';
    }

    async run() {
        if (this.fileToProcess) {
            console.log('\n*************************************************************************************');
            console.log('Applying ' + (this.getStrategiesDescription()) + ' strategies over file ', this.fileToProcess);
            let program = fs.readFileSync(this.fileToProcess, 'utf8');
            program = program.replace(/#include\s+\"(.*)\"/g, '_include ("asd")');
            try {
                const ast = esprima.parseScript(program, { loc: true });
                for (var strategy of this.strategies) {
                    strategy.process(ast);
                }
            } catch (err) {
                console.error('Error processing file ' + this.fileToProcess);
            }
        }
        else
            console.log('I do not have a file to analyze');
    }

    getStats() {
        return {
            globalVariables: {
                assignLeak: {
                    cant: 1,
                    details: [{ name: 'myGlobi', line: 121 }]
                },
                memberLeaks: {
                    cant: 1,
                    items: [{ name: 'mem.func', line: 1211 }]
                }
            },
            globalFunctions: {
                cant: 1,
                items: [{ name: 'MyFunc', line: 145 }]
            }
        }
    }

}