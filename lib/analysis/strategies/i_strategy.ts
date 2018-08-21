import { Program } from 'esprima';

export interface IStrategy {
    process(program: Program);
}