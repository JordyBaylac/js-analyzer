import { IStrategy } from '../i_strategy';
import { Node } from 'estree';
import { Program } from 'esprima';
import { traverse } from 'estraverse';
import * as utils from './esprima_utils';

export interface ILeakType {
    name: string,
    description: string,
    assignment: Node
}

export interface IScopeLeak {
    globalDefinitions: ILeakType[];
    memberAssigns: ILeakType[];
    literalAssigns: ILeakType[];
}


export interface ILeakInformation {
    scopeInformation: string,
    leaksTypes: IScopeLeak,
}


function doesScopeHasLeaks(scopeInfo: ILeakInformation) {
    return scopeInfo.leaksTypes.globalDefinitions.length > 0
        || scopeInfo.leaksTypes.memberAssigns.length > 0
        || scopeInfo.leaksTypes.literalAssigns.length > 0;
}

export class GlobalVariablesStrategy implements IStrategy {

    process(ast: Program) {

        let leaks: ILeakInformation[] = [];

        let variablesChain = [];
        let scopeChain = [];
        let assignments = [];

        traverse(ast, {
            enter: (node, parent) => {

                if (utils.shouldCreatesNewScope(node)) {
                    scopeChain.push([]);
                    variablesChain.push([]);
                }

                let currentScope = scopeChain[scopeChain.length - 1];
                let variableScope = variablesChain[variablesChain.length - 1];

                if (utils.isVariableDeclarator(node)) {

                    currentScope.push(node.id.name);
                    variableScope.push(node);

                } else if (utils.isAssignmentExpression(node)) {

                    assignments.push(node);

                } else if (utils.isFunctionDeclaration(node) || utils.isFunctionExpression(node)) {

                    let params = node.params;
                    for (let i in params) {
                        currentScope.push(params[i].name);
                    }

                    if (node.id && node.id.identifier && node.id.identifier.name)
                        currentScope.push(node.id.identifier.name);

                }

            },
            leave: (node, parent) => {
                if (utils.shouldCreatesNewScope(node)) {

                    let leaksTypes: IScopeLeak = {
                        globalDefinitions: [],
                        memberAssigns: [],
                        literalAssigns: []
                    };

                    let memberAndLiteralLeaks = this.checkForMemberAndLiteralLeaks(assignments, scopeChain);
                    leaksTypes.memberAssigns = memberAndLiteralLeaks.memberAssigns;
                    leaksTypes.literalAssigns = memberAndLiteralLeaks.literalAssigns;

                    assignments = [];
                    scopeChain.pop();
                    // let currentScope = scopeChain.pop();
                    // utils.printScope(currentScope, node);

                    let variableScope = variablesChain.pop();

                    if (node && utils.isProgam(node)) {
                        let globals = this.checkGlobalVariableDefinition(variableScope);
                        leaksTypes.globalDefinitions = globals;
                    }

                    leaks.push({
                        scopeInformation: utils.getScopeDescription(node),
                        leaksTypes: leaksTypes
                    });
                }
            }
        });

        this.analyzeLeaks(leaks);

    }


    checkGlobalVariableDefinition(variableScope) {
        let globals = [];
        for (let variable of variableScope) {

            let varname = variable.id.name;
            let description = '(declared global variable) ' + varname;
            let leakType: ILeakType = { name: varname, description: description, assignment: variable };

            globals.push(leakType);
        }
        return globals;
    }

    analyzeLeaks(leaksInfo: ILeakInformation[]) {

        for (let leak of leaksInfo) {
            if (doesScopeHasLeaks(leak)) {
                console.log('---------- ' + leak.scopeInformation + '  ----------');
                this.analyzeLeak(leak);
            }
        }
    }

    analyzeLeak(leakInfo: ILeakInformation) {

        let scopeLeak: IScopeLeak = leakInfo.leaksTypes;

        if (scopeLeak.memberAssigns.length === 0 && scopeLeak.literalAssigns.length === 0 && scopeLeak.globalDefinitions.length === 0)
            return;

        // console.log(''.padStart(20, '-') + utils.getScopeDescription(node) + ''.padStart(20, '-'));

        if (scopeLeak.memberAssigns.length > 0) {
            console.log('> Possible Global member assign leaks : ' + scopeLeak.memberAssigns.length);
            for (let memberLeak of scopeLeak.memberAssigns) {
                console.log('  - ' + memberLeak.name, 'on line', memberLeak.assignment.loc.start.line);
            }
        }

        if (scopeLeak.literalAssigns.length > 0) {
            console.log('> Possible Global literal assign leaks : ' + scopeLeak.literalAssigns.length);
            for (let literalLeak of scopeLeak.literalAssigns) {
                console.log('  - ' + literalLeak.name, 'on line', literalLeak.assignment.loc.start.line);
            }
        }

        if (scopeLeak.globalDefinitions && scopeLeak.globalDefinitions.length > 0) {
            console.log('> Possible Global definitions leaks : ' + scopeLeak.globalDefinitions.length);
            for (let globalDefinition of scopeLeak.globalDefinitions) {
                console.log('  - ' + globalDefinition.name, 'on line', globalDefinition.assignment.loc.start.line);
            }
        }

        console.log();
    }

    checkForMemberAndLiteralLeaks(assignments, scopeChain): IScopeLeak {

        let leakTypes: IScopeLeak = {
            globalDefinitions: [],
            memberAssigns: [],
            literalAssigns: []
        };

        for (let i = 0; i < assignments.length; i++) {

            let assignment = assignments[i];
            let varname = '';
            let description = '';


            // if (utils.isMemberExpression(assignment.left) && !utils.isThisExpression(assignment.left.object)) {
            //     varname = utils.compoundMemberName(assignment.left);
            //     if (varname.indexOf('.prototype') == -1 && varname.indexOf('this.') == -1) {
            //         let firstObject = varname.split('.')[0];
            //         if (!utils.isVarDefined(firstObject, scopeChain) /*&& !utils.isFunctionDefined(firstObject, scopeChain)*/) {
            //             description = '(member assign) ' + varname;

            //             let leakType: ILeakType = { name: varname, description: description, assignment: assignment };
            //             leakTypes.memberAssigns.push(leakType);
            //         }
            //     }
            // } else
             if (!utils.isMemberExpression(assignment.left)) {
                varname = assignment.left.name;
                if (!utils.isVarDefined(varname, scopeChain)) {
                    description = '(literal assign) ' + varname;

                    let leakType: ILeakType = { name: varname, description: description, assignment: assignment };
                    leakTypes.literalAssigns.push(leakType);
                }
            }

        }


        return leakTypes;
    }

}