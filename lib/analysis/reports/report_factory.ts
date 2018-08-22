import { IFileAnalysis } from '../analyzer/file_analyzer';
import { IDirectoryAnalysis } from '../analyzer/directory_analyzer';
import { ConsoleReporter } from './console_reporter';

export enum ReportMode { console = 1 }

export class ReportFactory {

    createReporter(analysisResult: IDirectoryAnalysis | IFileAnalysis, mode: ReportMode): ConsoleReporter {

        if (!analysisResult || !mode) {
            throw new Error('>>> Psss!! we cannot create a report without <analysisResult> and <mode> available');
        }

        if(mode === ReportMode.console) {
            return new ConsoleReporter(analysisResult);
        } else {
            throw new Error('>>> Psss!! we dont support the report <mode> specified');
        }

    }
}
