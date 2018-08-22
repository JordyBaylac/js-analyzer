
import { IFileAnalysis } from '../analyzer/file_analyzer';
import { IDirectoryAnalysis } from '../analyzer/directory_analyzer';
import { IStrategyResult, StrategiesTypes } from '../strategies/i_strategy';
import { ILeakInformation, doesScopeHasLeaks, IScopeLeak } from '../strategies/global_variables/global_variables_strategy';



export class ConsoleReporter {

    private analysisResult: IDirectoryAnalysis | IFileAnalysis;
    private indentationLevel: number = 3;

    constructor(analysisResult: IDirectoryAnalysis | IFileAnalysis) {
        this.analysisResult = analysisResult
    }

    run() {
        if (this.isDirectoryAnalysis(this.analysisResult)) {
            this.reportDirectory(this.analysisResult);
        }
        else if (this.isFileAnalysis(this.analysisResult)) {
            this.reportFile(this.analysisResult);
            this.indentationLevel = 1;
        } else {
            throw new Error('>>> Psss!! we only support file or directory analysis in <analysisResult>');
        }
    }


    protected isDirectoryAnalysis(analysis: IDirectoryAnalysis | IFileAnalysis): analysis is IDirectoryAnalysis {
        return (<IDirectoryAnalysis>analysis).filesResults !== undefined;
    }

    protected isFileAnalysis(analysis: IDirectoryAnalysis | IFileAnalysis): analysis is IFileAnalysis {
        return (<IFileAnalysis>analysis).strategiesResults !== undefined;
    }

    protected getIndentation(multiplier: number = 1) {
        let spaces = '';
        for (let i = 0; i < this.indentationLevel * multiplier; i++) {
            spaces += ' ';
        }
        return spaces;
    }

    protected reportDirectory(directoryAnalysis: IDirectoryAnalysis) {
        console.log('> Reporting analysis over directory', directoryAnalysis.dirPath);
        for (let fileAnalysis of directoryAnalysis.filesResults) {
            this.reportFile(fileAnalysis);
        }
        console.log('< END analysis over directory', directoryAnalysis.dirPath);
    }

    protected reportFile(fileAnalysis: IFileAnalysis) {
        if (this.indentationLevel > 1)
            console.log();
        console.log(this.getIndentation(), '> Reporting analysis over file', fileAnalysis.filePath);
        for (let strategyResult of fileAnalysis.strategiesResults) {
            this.reportStrategy(strategyResult);
        }
        console.log(this.getIndentation(), '< END analysis over file', fileAnalysis.filePath);
    }

    protected reportStrategy(strategyResult: IStrategyResult) {
        console.log();
        console.log(this.getIndentation(2), '> Reporting strategy', StrategiesTypes[strategyResult.type].toString());

        if (strategyResult.type === StrategiesTypes.GlobalVariablesStrategy) {
            let results = <ILeakInformation[]>strategyResult.result;
            this.analyzeLeaks(results);
        } else {
            throw new Error('>>> Psss!! we dont support other reporter');
        }
    }

    protected analyzeLeaks(leaksInfo: ILeakInformation[]) {

        for (let leak of leaksInfo) {
            if (doesScopeHasLeaks(leak)) {
                console.log();
                console.log(this.getIndentation(3), '---------- ' + leak.scopeDescription + '  ----------');
                this.analyzeLeak(leak);
            }
        }
    }

    protected analyzeLeak(leakInfo: ILeakInformation) {

        let scopeLeak: IScopeLeak = leakInfo.leaksTypes;

        if (scopeLeak.memberAssigns.length === 0
            && scopeLeak.literalAssigns.length === 0
            && scopeLeak.globalDefinitions.length === 0
            && scopeLeak.globalUses.length === 0) {
            return;
        }

        if (scopeLeak.memberAssigns.length > 0) {
            console.log(this.getIndentation(4), '> Possible Global member assign leaks : ' + scopeLeak.memberAssigns.length);
            for (let memberLeak of scopeLeak.memberAssigns) {
                console.log(this.getIndentation(5), '--' + memberLeak.name + '--', 'on line', memberLeak.location.start.line, 'col', memberLeak.location.start.column);
            }
            console.log();
        }

        if (scopeLeak.literalAssigns.length > 0) {
            console.log(this.getIndentation(4), '> Possible Global literal assign leaks : ' + scopeLeak.literalAssigns.length);
            for (let literalLeak of scopeLeak.literalAssigns) {
                console.log(this.getIndentation(5), '--' + literalLeak.name + '--', 'on line', literalLeak.location.start.line, 'col', literalLeak.location.start.column);
            }
            console.log();
        }

        if (scopeLeak.globalDefinitions && scopeLeak.globalDefinitions.length > 0) {
            console.log(this.getIndentation(4), '> Possible Global definitions leaks : ' + scopeLeak.globalDefinitions.length);
            for (let globalDefinition of scopeLeak.globalDefinitions) {
                console.log(this.getIndentation(5), '--' + globalDefinition.name + '--', 'on line', globalDefinition.location.start.line, 'col', globalDefinition.location.start.column);
            }
            console.log();
        }

        if (scopeLeak.globalUses && scopeLeak.globalUses.length > 0) {
            console.log(this.getIndentation(4), '> Possible Global uses leaks : ' + scopeLeak.globalUses.length);
            for (let globalUse of scopeLeak.globalUses) {
                console.log(this.getIndentation(5), '--' + globalUse.name + '--', 'on line', globalUse.location.start.line, 'col', globalUse.location.start.column);
            }
            console.log();
        }

        console.log();
    }

} 
