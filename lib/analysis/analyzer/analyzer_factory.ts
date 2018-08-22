const fs = require('fs');
const path = require('path');

import { FileAnalyzer } from './file_analyzer'
import { DirectoryAnalyzer } from './directory_analyzer'
import { IStrategy } from '../strategies/i_strategy';

export interface AnalysisOptions {
    input: string,
    output: string,
    reportMode: string,
    omit: string[]
}  

export class AnalyzerFactory {

    createAnalyzer(filePath: string, analysisStrategies: IStrategy[]): DirectoryAnalyzer | FileAnalyzer {

        if (!filePath || !analysisStrategies || analysisStrategies.length === 0) {
            throw new Error('>>> Psss!! provide a path to analyze and at least an analysis strategy');
        }

        let fileToProcess = this.getFileToProcess(filePath);

        if (this.isDirectory(fileToProcess)) {
            return new DirectoryAnalyzer(fileToProcess, analysisStrategies);
        }
        else {
            return new FileAnalyzer(fileToProcess, analysisStrategies);
        }

    }

    protected getFileToProcess(filePath: string) {
        let fileToProcess = null;
        if (filePath) {

            if (!path.isAbsolute(filePath)) {
                throw new Error('>>> Psss!! we only support absolute path of file or director');
            }

            if (!fs.existsSync(filePath)) {
                throw new Error('>>> Psss!! file or directory ' + filePath + ' does not exist');
            }            
            
            fileToProcess = filePath;

        }
        else {
            throw new Error('>>> Psss!! you need to specify a file or directory to parse');
        }

        return fileToProcess;
    }

    protected isDirectory(filePath: string) {
        return filePath && fs.lstatSync(filePath).isDirectory();
    }

}
