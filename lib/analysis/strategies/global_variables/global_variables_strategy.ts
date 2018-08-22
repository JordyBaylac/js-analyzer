import { IStrategy, IStrategyResult, IStrategySingleResult, StrategiesTypes } from '../i_strategy';
import { Node, SourceLocation } from 'estree';
import { Program } from 'esprima';
import { traverse } from 'estraverse';
import * as utils from './esprima_utils';


export interface ILeakType {
    name: string,
    description: string,
    location: SourceLocation;
}

export interface IScopeLeak {
    globalDefinitions: ILeakType[];
    globalUses: ILeakType[];
    memberAssigns: ILeakType[];
    literalAssigns: ILeakType[];
}


export interface ILeakInformation extends IStrategySingleResult {
    scopeDescription: string,
    leaksTypes: IScopeLeak,
}


export function doesScopeHasLeaks(scopeInfo: ILeakInformation) {
    return scopeInfo.leaksTypes.globalDefinitions.length > 0
        || scopeInfo.leaksTypes.globalUses.length > 0
        || scopeInfo.leaksTypes.memberAssigns.length > 0
        || scopeInfo.leaksTypes.literalAssigns.length > 0;
}

export class GlobalVariablesStrategy implements IStrategy {

    process(ast: Program): IStrategyResult {

        let leaks: ILeakInformation[] = [];

        let variablesChain = [];
        let scopeChain = [];
        let usesChain = [];
        let assignmentsChain = [];
        let catchsChain = [];

        traverse(ast, {
            enter: (node, parent) => {

                if (utils.shouldCreatesNewScope(node)) {
                    scopeChain.push([]);
                    variablesChain.push([]);
                    usesChain.push([]);
                    assignmentsChain.push([]);
                }

                let currentScope = scopeChain[scopeChain.length - 1];
                let variableScope = variablesChain[variablesChain.length - 1];
                let usesInScope = usesChain[usesChain.length - 1];
                let assignemtsInScope = assignmentsChain[assignmentsChain.length - 1];

                if (utils.isVariableDeclarator(node)) {

                    currentScope.push(node.id.name);
                    variableScope.push(node);

                } else if (utils.isAssignmentExpression(node)) {

                    assignemtsInScope.push(node);

                } else if (utils.isFunctionDeclaration(node) || utils.isFunctionExpression(node)) {

                    let params = node.params;
                    for (let i in params) {
                        currentScope.push(params[i].name);
                    }

                    if (node.id && utils.isIdentifier(node.id) && node.id.name) {
                        currentScope.push(node.id.name);
                        let previousScope = (scopeChain.length - 2) >= 0 ? scopeChain[scopeChain.length - 2] : null;
                        if (previousScope) {
                            previousScope.push(node.id.name);
                        }
                    }

                } else if (utils.isCatchClause(node) && utils.isIdentifier(node.param)) {
                    catchsChain.push(node.param.name);
                }

                let scopeUses = this.getGlobalUsesInNode(node);
                if (scopeUses.length > 0) {
                    usesInScope.push(...scopeUses);
                }

            },
            leave: (node, parent) => {


                if (utils.shouldCreatesNewScope(node)) {

                    let leaksTypes: IScopeLeak = {
                        globalDefinitions: [],
                        globalUses: [],
                        memberAssigns: [],
                        literalAssigns: []
                    };

                    let assigmentsInScope = assignmentsChain.pop();

                    let memberAndLiteralLeaks = this.checkForMemberAndLiteralLeaks(assigmentsInScope, scopeChain);
                    leaksTypes.memberAssigns = memberAndLiteralLeaks.memberAssigns;
                    leaksTypes.literalAssigns = memberAndLiteralLeaks.literalAssigns.filter(a => !utils.isCatchArgument(a.name, catchsChain));


                    let variableScope = variablesChain.pop();

                    if (node && utils.isProgam(node)) {
                        let globals = this.getGlobalVariablesDefinition(variableScope);
                        leaksTypes.globalDefinitions = globals;
                    }

                    let usesScope = usesChain.pop();
                    usesScope.filter((u: ILeakType) => !utils.isCatchArgument(u.name, catchsChain))
                        .forEach((s: ILeakType) => {
                            if (!utils.isVarDefined(s.name, scopeChain)) {
                                leaksTypes.globalUses.push(s);
                            }
                        });

                    scopeChain.pop();

                    leaks.push({
                        scopeDescription: utils.getScopeDescription(node),
                        leaksTypes: leaksTypes
                    });

                } else if (utils.isCatchClause(node) && utils.isIdentifier(node.param)) {

                    for (let i = 0; i < usesChain.length; i++) {
                        let usesScope = usesChain[i];
                        let withouthUsesOfCatchArguments = usesScope.filter((s: ILeakType) => !utils.isCatchArgument(s.name, catchsChain));
                        usesChain[i] = withouthUsesOfCatchArguments;
                    }

                    catchsChain.pop();

                }
            }
        });

        return <IStrategyResult>{ 
            type: StrategiesTypes.GlobalVariablesStrategy,
            result: leaks
        };

    }


    protected checkForMemberAndLiteralLeaks(assignments, scopeChain): IScopeLeak {

        let leakTypes: IScopeLeak = {
            globalDefinitions: [],
            globalUses: [],
            memberAssigns: [],
            literalAssigns: []
        };

        for (let i = 0; i < assignments.length; i++) {

            let assignment = assignments[i];
            let varname = '';
            let description = '';


            if (utils.isMemberExpression(assignment.left) && !utils.isThisExpression(assignment.left.object)) {
                varname = utils.compoundMemberName(assignment.left);
                if (varname.indexOf('.prototype') == -1
                    && varname.indexOf('this.') == -1
                    && varname.indexOf('Object.') == -1
                    && varname.indexOf('Array.') == -1
                    && varname.indexOf('Math.') == -1
                    && varname.indexOf('JSON.') == -1) {

                    let firstObject = varname.split('.')[0];
                    if (!utils.isVarDefined(firstObject, scopeChain)) {
                        description = '(member assign) ' + varname;

                        let leakType: ILeakType = { name: varname, description: description, location: Object.create(assignment.loc) };
                        leakTypes.memberAssigns.push(leakType);
                    }
                }
            } else
                if (!utils.isMemberExpression(assignment.left)) {
                    varname = assignment.left.name;
                    if (!utils.isVarDefined(varname, scopeChain)) {
                        description = '(literal assign) ' + varname;

                        let leakType: ILeakType = { name: varname, description: description, location: Object.create(assignment.loc) };
                        leakTypes.literalAssigns.push(leakType);
                    }
                }

        }


        return leakTypes;
    }

    protected getGlobalVariablesDefinition(variableScope: Node[]): ILeakType[] {
        let globals: ILeakType[] = [];
        for (let variable of variableScope) {

            let varname = variable["id"].name;
            let description = '(declared global variable) ' + varname;
            let leakType: ILeakType = { name: varname, description: description, location: Object.create(variable.loc) };

            globals.push(leakType);
        }
        return globals;
    }

    protected getGlobalUsesInNode(node: Node): ILeakType[] {

        let uses: ILeakType[] = [];

        if (utils.isBinaryExpression(node)) {

            if (utils.isIdentifier(node["left"])) {
                node["left"]["parent"] = node;
                let varname = node["left"].name;
                let description = '(global use) ' + varname;
                let leakType: ILeakType = { name: varname, description: description, location: Object.create(node["left"].loc) };
                uses.push(leakType);

            } else if (utils.isIdentifier(node["right"])) {
                node["right"]["parent"] = node;
                let varname = node["right"].name;
                let description = '(global use) ' + varname;
                let leakType: ILeakType = { name: varname, description: description, location: Object.create(node["right"].loc) };
                uses.push(leakType);

            } else if (utils.isBinaryExpression(node["left"])) {

                uses = uses.concat(this.getGlobalUsesInNode(node["left"]));

            } else if (utils.isBinaryExpression(node["right"])) {

                uses = uses.concat(this.getGlobalUsesInNode(node["right"]));

            }

        } else if (utils.isCallExpression(node)) {

            node["arguments"].forEach(a => {
                if (utils.isIdentifier(a)) {
                    let varname = a.name;
                    let description = '(global use) ' + varname;
                    a["parent"] = node;
                    let leakType: ILeakType = { name: varname, description: description, location: Object.create(a.loc) };
                    uses.push(leakType);
                }
            });

        }

        return uses.filter(u => ["__file__", "Math", "Object", "Array", "JSON"].indexOf(u.name) === -1);
    }

}