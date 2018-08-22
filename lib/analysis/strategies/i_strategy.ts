import { Program } from 'esprima';

export enum StrategiesTypes { GlobalVariablesStrategy = 1 }

export interface IStrategySingleResult {

}

export interface IStrategyResult {
    type: StrategiesTypes,
    result: IStrategySingleResult
}

export interface IStrategy {
    
    process(ast: Program) : IStrategyResult;
    
}