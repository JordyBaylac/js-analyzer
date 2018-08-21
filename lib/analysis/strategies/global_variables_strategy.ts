import { IStrategy } from './i_strategy';
import { Program } from 'esprima';

export class GlobalVariablesStrategy implements IStrategy {

    process(program: Program) {
        throw new Error("GlobalVariablesStrategy has not implemented process method.");
    }

}