import { IStrategy } from '../i_strategy';
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


export interface ILeakInformation {
    scopeDescription: string,
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
        let usesChain = [];
        let assignments = [];

        traverse(ast, {
            enter: (node, parent) => {

                if (utils.shouldCreatesNewScope(node)) {
                    scopeChain.push([]);
                    variablesChain.push([]);
                    usesChain.push([]);
                }

                let currentScope = scopeChain[scopeChain.length - 1];
                let variableScope = variablesChain[variablesChain.length - 1];
                var usesInScope = usesChain[usesChain.length - 1];

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

                    if (node.id && node.id.type === "Identifier" && node.id.name) {
                        currentScope.push(node.id.name);
                        let previousScope = (scopeChain.length - 2) >= 0 ? scopeChain[scopeChain.length - 2] : null;
                        if(previousScope) {
                            // console.log('previous scope', previousScope);
                            previousScope.push(node.id.name);
                        } else {
                            // console.log('no prvious scope for ' + node.id.name);
                        }
                    }

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


                    let memberAndLiteralLeaks = this.checkForMemberAndLiteralLeaks(assignments, scopeChain);
                    leaksTypes.memberAssigns = memberAndLiteralLeaks.memberAssigns;
                    leaksTypes.literalAssigns = memberAndLiteralLeaks.literalAssigns;

                    assignments = [];
                    

                    let variableScope = variablesChain.pop();

                    if (node && utils.isProgam(node)) {
                        let globals = this.checkGlobalVariableDefinition(variableScope);
                        leaksTypes.globalDefinitions = globals;
                    }

                    let usesScope = usesChain.pop();
                    if (usesScope.length > 0) {
                        usesScope.forEach(s => {
                            if (!utils.isVarDefined(s.name, scopeChain)) {
                                leaksTypes.globalUses.push(s);
                            }
                        });
                    }

                    scopeChain.pop();
                    // utils.printScope(currentScope, node);

                    leaks.push({
                        scopeDescription: utils.getScopeDescription(node),
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
            let leakType: ILeakType = { name: varname, description: description, location: variable.loc };

            globals.push(leakType);
        }
        return globals;
    }

    analyzeLeaks(leaksInfo: ILeakInformation[]) {

        for (let leak of leaksInfo) {
            if (doesScopeHasLeaks(leak)) {
                console.log('---------- ' + leak.scopeDescription + '  ----------');
                this.analyzeLeak(leak);
            }
        }
    }

    analyzeLeak(leakInfo: ILeakInformation) {

        let scopeLeak: IScopeLeak = leakInfo.leaksTypes;

        if (scopeLeak.memberAssigns.length === 0
            && scopeLeak.literalAssigns.length === 0
            && scopeLeak.globalDefinitions.length === 0
            && scopeLeak.globalUses.length === 0)
            return;

        // console.log(''.padStart(20, '-') + utils.getScopeDescription(node) + ''.padStart(20, '-'));

        if (scopeLeak.memberAssigns.length > 0) {
            console.log('    > Possible Global member assign leaks : ' + scopeLeak.memberAssigns.length);
            for (let memberLeak of scopeLeak.memberAssigns) {
                console.log('        --' + memberLeak.name + '--', 'on line', memberLeak.location.start.line, 'col', memberLeak.location.start.column);
            }
        }

        if (scopeLeak.literalAssigns.length > 0) {
            console.log('    > Possible Global literal assign leaks : ' + scopeLeak.literalAssigns.length);
            for (let literalLeak of scopeLeak.literalAssigns) {
                console.log('        --' + literalLeak.name + '--', 'on line', literalLeak.location.start.line, 'col', literalLeak.location.start.column);
            }
        }

        if (scopeLeak.globalDefinitions && scopeLeak.globalDefinitions.length > 0) {
            console.log('    > Possible Global definitions leaks : ' + scopeLeak.globalDefinitions.length);
            for (let globalDefinition of scopeLeak.globalDefinitions) {
                console.log('        --' + globalDefinition.name + '--', 'on line', globalDefinition.location.start.line, 'col', globalDefinition.location.start.column);
            }
        }

        if (scopeLeak.globalUses && scopeLeak.globalUses.length > 0) {
            console.log('    > Possible Global uses leaks : ' + scopeLeak.globalUses.length);
            for (let globalUse of scopeLeak.globalUses) {
                console.log('        --' + globalUse.name + '--', 'on line', globalUse.location.start.line, 'col', globalUse.location.start.column);
            }
        }

        console.log();
    }

    checkForMemberAndLiteralLeaks(assignments, scopeChain): IScopeLeak {

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
                    if (!utils.isVarDefined(firstObject, scopeChain) /*&& !utils.isFunctionDefined(firstObject, scopeChain)*/) {
                        description = '(member assign) ' + varname;

                        let leakType: ILeakType = { name: varname, description: description, location: assignment.loc };
                        leakTypes.memberAssigns.push(leakType);
                    }
                }
            } else
            if (!utils.isMemberExpression(assignment.left)) {
                varname = assignment.left.name;
                if (!utils.isVarDefined(varname, scopeChain)) {
                    description = '(literal assign) ' + varname;

                    let leakType: ILeakType = { name: varname, description: description, location: assignment.loc };
                    leakTypes.literalAssigns.push(leakType);
                }
            }

        }


        return leakTypes;
    }

    getGlobalUsesInNode(node: Node): ILeakType[] {

        let uses: ILeakType[] = [];

        if (node.type === "BinaryExpression") {
            if (node.left.type == "Identifier") {

                let varname = node.left.name;
                let description = '(global use) ' + varname;
                let leakType: ILeakType = { name: varname, description: description, location: node.left.loc };
                uses.push(leakType);

            } else if (node.right.type == "Identifier") {

                let varname = node.right.name;
                let description = '(global use) ' + varname;
                let leakType: ILeakType = { name: varname, description: description, location: node.right.loc };
                uses.push(leakType);

            } else if (node.left.type == "BinaryExpression") {

                uses = uses.concat(this.getGlobalUsesInNode(node.left));

            } else if (node.right.type == "BinaryExpression") {

                uses = uses.concat(this.getGlobalUsesInNode(node.right));

            }
        } else if (node.type === "CallExpression") {
            node.arguments.forEach(a => {
                if (a.type === "Identifier") {
                    let varname = a.name;
                    let description = '(global use) ' + varname;
                    let leakType: ILeakType = { name: varname, description: description, location: a.loc };
                    uses.push(leakType);
                }
            });
        }

        return uses.filter(u => ["__file__", "Math", "Object","Array"].indexOf(u.name) === -1);
    }

}