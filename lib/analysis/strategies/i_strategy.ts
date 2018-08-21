import { Program } from 'esprima';

export interface IStrategy {
    process(ast: Program);
}