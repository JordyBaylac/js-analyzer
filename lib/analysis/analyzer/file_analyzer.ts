import { IStrategy, IStrategyResult } from '../strategies/i_strategy';
import * as esprima from 'esprima';
import * as fs from 'fs';

export interface IFileAnalysis {
    filePath: string,
    strategiesResults: IStrategyResult[]
} 

export class FileAnalyzer {

    private fileToProcess: string;
    private strategies: IStrategy[];
    private analysisResult: IFileAnalysis;

    constructor(filePath: string, strategies: IStrategy[]) {
        this.fileToProcess = filePath;
        this.strategies = strategies || [];
        this.analysisResult = <IFileAnalysis>{ filePath: this.fileToProcess, strategiesResults: [] };
    }

    async run() {
        if (this.fileToProcess) {
            let program = fs.readFileSync(this.fileToProcess, 'utf8');
            program = program.replace(/#include\s+\"(.*)\"/g, '_include ("asd")');
            try {
                const ast = esprima.parseScript(program, { loc: true });
                for (var strategy of this.strategies) {
                    let strategyResult = strategy.process(ast);
                    this.analysisResult.strategiesResults.push(strategyResult);

                }
            } catch (err) {
                console.error('>>> Pss!! Error processing file ' + this.fileToProcess, ' err = ', err);
            }
        }
        else
            console.error('>>> Pss!! I do not have a file to analyze');
    }


    getResult(): IFileAnalysis {
        return this.analysisResult;
    }

}