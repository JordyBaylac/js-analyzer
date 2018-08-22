import { FileAnalyzer } from "./file_analyzer";
import { IStrategy } from '../strategies/i_strategy';

const klaw = require('klaw');
const through2 = require('through2');
const path = require('path');


const JAVASCRIPT_EXTENSIONS = ['.xjs', '.js'];

export class DirectoryAnalyzer {

    private dirPath: string;
    private strategies: IStrategy[];
    private stats: {};


    constructor(dirPath: string, strategies: IStrategy[]) {
        this.dirPath = dirPath;
        this.strategies = strategies || [];

        this.stats = {
            globalVariables: {
                byAssign: {
                    cant: 1,
                    details: [{ name: 'fareIn', line: 450 }]
                }
            }
        };
    }

    getStrategiesDescription() {
        return '[' + this.strategies.map(s => s.constructor.name).join(',') + ']';        
    }

    async run() {
        if (this.dirPath) {
            console.log('Applying ' + (this.getStrategiesDescription()) + ' strategies over directory ', this.dirPath);
            try {
                let files = await this.getAllFiles(this.dirPath);
                await this.analyzeFiles(files);
            }
            catch (err) {
                console.error('>>> Psss!! there is an error', err);
            };
        }
        else
            console.log('I do not have a directory to analyze');
    }

    getStats() {
        return this.stats;
    }

    protected async analyzeFiles(filesToProcess) {
        // console.table(filesToProcess);
        for (var filePath of filesToProcess) {
            let fileAnalyzer = new FileAnalyzer(filePath, this.strategies);
            await fileAnalyzer.run();
            let fileStats = fileAnalyzer.getStats();
        }
    }

    protected getAllFiles(dirPath) : Promise<string[]> {

        return new Promise((resolve, reject) => {

            const excludeHiddenFilter = item => {
                // no hidden directories
                const basename = path.basename(item);
                if (basename === '.' || basename[0] !== '.')
                    return true;

                return false;
            }


            const excludeDirFilter = through2.obj(function (item, enc, next) {
                if (!item.stats.isDirectory())
                    this.push(item);
                next();
            });

            const excludeNonJavascriptFilter = through2.obj(function (item, enc, next) {
                const extension = path.extname(item.path);
                if (JAVASCRIPT_EXTENSIONS.indexOf(extension) !== -1)
                    this.push(item);
                next();
            });

            const items: string[] = []; 

            klaw(dirPath, { filter: excludeHiddenFilter, preserveSymlinks: true })
                .on('error', err => excludeDirFilter.emit('error', err))
                .pipe(excludeDirFilter)
                .on('error', err => excludeNonJavascriptFilter.emit('error', err))
                .pipe(excludeNonJavascriptFilter)
                .on('error', err => reject(err))
                .on('data', item => items.push(item.path))
                .on('end', () => {
                    resolve(items);
                });
                
        });


    }

}