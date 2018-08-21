import { IStrategy } from '../strategies/i_strategy';


export class FileAnalyzer {

    private fileToProcess: string;
    private strategies: IStrategy[];

    constructor(filePath: string, strategies: IStrategy[]) {
        this.fileToProcess = filePath;
        this.strategies = strategies || [];
    }

    async run() {
        if (this.fileToProcess) {
            console.log('Applying '+ (JSON.stringify(this.strategies)) +' strategies over file ', this.fileToProcess);
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