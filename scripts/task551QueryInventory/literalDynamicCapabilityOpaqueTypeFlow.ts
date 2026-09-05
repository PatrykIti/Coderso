/** Operation-receiver safety for opaque literal dynamic capability type flow. */
import type * as tsNS from "typescript";

import type { LiteralDynamicCapabilityFactoryAnalysis } from "./literalDynamicCapabilityFactories";

type TypeScriptAdapter = typeof tsNS;
type Resolver = (reference: tsNS.Identifier) => tsNS.Identifier | null;

type OpaqueTypeFlowOptions = Readonly<{
  ts: TypeScriptAdapter;
  sourceFile: tsNS.SourceFile;
  resolver: Resolver;
  analysis: LiteralDynamicCapabilityFactoryAnalysis;
  typeIsOpaque: (type: tsNS.TypeNode) => boolean;
  isProvenValue: (expression: tsNS.Expression) => boolean;
  unwrap: (expression: tsNS.Expression) => tsNS.Expression;
  onInvalid: () => void;
}>;

const DATABASE_OPERATIONS = new Set([
  "batch",
  "delete",
  "execute",
  "insert",
  "query",
  "select",
  "transaction",
  "update",
]);
const OPAQUE_OPERATION_TYPE =
  /(?:batch|delete|execute|insert|query|select|transaction|update)[ \t]*(?:<[^>]*>)?[ \t]*\(/;

function bindingIdentifiers(
  ts: TypeScriptAdapter,
  name: tsNS.BindingName
): readonly tsNS.Identifier[] {
  if (ts.isIdentifier(name)) return [name];
  return name.elements.flatMap((element) =>
    ts.isBindingElement(element) ? bindingIdentifiers(ts, element.name) : []
  );
}

function functionBinding(
  ts: TypeScriptAdapter,
  analysis: LiteralDynamicCapabilityFactoryAnalysis,
  functionLike: tsNS.FunctionLikeDeclaration
): tsNS.Identifier | null {
  for (const [declaration, target] of analysis.namedFunctions)
    if (target === functionLike) return declaration;
  if (ts.isFunctionDeclaration(functionLike)) return functionLike.name ?? null;
  const parent = functionLike.parent;
  return ts.isVariableDeclaration(parent) &&
    parent.initializer === functionLike &&
    ts.isIdentifier(parent.name)
    ? parent.name
    : null;
}

function functionReturnExpressions(
  ts: TypeScriptAdapter,
  functionLike: tsNS.FunctionLikeDeclaration
): readonly tsNS.Expression[] {
  if (functionLike.body === undefined) return [];
  if (!ts.isBlock(functionLike.body)) return [functionLike.body];
  const expressions: tsNS.Expression[] = [];
  const visit = (node: tsNS.Node): void => {
    if (node !== functionLike.body && ts.isFunctionLike(node)) return;
    if (ts.isReturnStatement(node) && node.expression !== undefined)
      expressions.push(node.expression);
    else ts.forEachChild(node, visit);
  };
  visit(functionLike.body);
  return expressions;
}

function propertyName(ts: TypeScriptAdapter, name: tsNS.PropertyName | undefined): string | null {
  return name !== undefined && (ts.isIdentifier(name) || ts.isStringLiteral(name))
    ? name.text
    : null;
}

function mappedReceiverDeclaration(
  ts: TypeScriptAdapter,
  resolver: Resolver,
  unwrap: (expression: tsNS.Expression) => tsNS.Expression,
  expression: tsNS.Expression
): tsNS.Identifier | null {
  const value = unwrap(expression);
  if (ts.isIdentifier(value)) return resolver(value);
  if (!ts.isNewExpression(value)) return null;
  const constructor = unwrap(value.expression);
  return ts.isIdentifier(constructor) ? resolver(constructor) : null;
}

/** Rejects opaque acquisition only when it reaches a database-operation receiver. */
export function assertNoUnprovenOpaqueLiteralDynamicDatabaseTypeFlow(
  options: OpaqueTypeFlowOptions
): void {
  const { ts, sourceFile, resolver, analysis, typeIsOpaque, isProvenValue, unwrap, onInvalid } =
    options;
  const opaqueBindings = new Set<tsNS.Identifier>();
  const opaqueFactories = new Set<tsNS.Identifier>();
  const opaqueOperationBindings = new Set<tsNS.Identifier>();
  const opaqueOperationFactories = new Set<tsNS.Identifier>();
  const opaqueValueProperties = new Map<tsNS.Identifier, Set<string>>();
  const opaqueFactoryProperties = new Map<tsNS.Identifier, Set<string>>();
  const opaqueOperationProperties = new Map<tsNS.Identifier, Set<string>>();
  const provenContainerParameters = new Set<tsNS.Identifier>();
  for (const container of analysis.objectContainers.values())
    if (ts.isIdentifier(container.parameter.name))
      provenContainerParameters.add(container.parameter.name);
  const isOpaqueAnnotation = (type: tsNS.TypeNode): boolean =>
    typeIsOpaque(type) ||
    type.kind === ts.SyntaxKind.AnyKeyword ||
    type.kind === ts.SyntaxKind.UnknownKeyword ||
    OPAQUE_OPERATION_TYPE.test(type.getText(sourceFile));
  const addBinding = (identifier: tsNS.Identifier): boolean => {
    if (opaqueBindings.has(identifier)) return false;
    opaqueBindings.add(identifier);
    return true;
  };
  const addFactory = (identifier: tsNS.Identifier): boolean => {
    if (opaqueFactories.has(identifier)) return false;
    opaqueFactories.add(identifier);
    return true;
  };
  const addOperationBinding = (identifier: tsNS.Identifier): boolean => {
    const bindingChanged = addBinding(identifier);
    if (opaqueOperationBindings.has(identifier)) return bindingChanged;
    opaqueOperationBindings.add(identifier);
    return true;
  };
  const addOperationFactory = (identifier: tsNS.Identifier): boolean => {
    const factoryChanged = addFactory(identifier);
    if (opaqueOperationFactories.has(identifier)) return factoryChanged;
    opaqueOperationFactories.add(identifier);
    return true;
  };
  const addProperties = (
    target: Map<tsNS.Identifier, Set<string>>,
    identifier: tsNS.Identifier,
    names: ReadonlySet<string>
  ): boolean => {
    if (names.size === 0) return false;
    const current = target.get(identifier) ?? new Set<string>();
    let changed = false;
    for (const name of names)
      if (!current.has(name)) {
        current.add(name);
        changed = true;
      }
    if (changed) target.set(identifier, current);
    return changed;
  };
  const receiverHasProperty = (
    target: ReadonlyMap<tsNS.Identifier, ReadonlySet<string>>,
    receiver: tsNS.Expression,
    name: string
  ): boolean => {
    const declaration = mappedReceiverDeclaration(ts, resolver, unwrap, receiver);
    return declaration !== null && target.get(declaration)?.has(name) === true;
  };
  const addOperationProperties = (
    identifier: tsNS.Identifier,
    names: ReadonlySet<string>
  ): boolean => {
    const opaqueChanged = addProperties(opaqueValueProperties, identifier, names);
    const operationChanged = addProperties(opaqueOperationProperties, identifier, names);
    return opaqueChanged || operationChanged;
  };
  const opaqueParameter = (reference: tsNS.Identifier): boolean => {
    const declaration = resolver(reference);
    return (
      declaration !== null &&
      !provenContainerParameters.has(declaration) &&
      ts.isParameter(declaration.parent) &&
      declaration.parent.type !== undefined &&
      isOpaqueAnnotation(declaration.parent.type)
    );
  };
  const isValueFlowBinary = (expression: tsNS.BinaryExpression): boolean =>
    expression.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
    expression.operatorToken.kind === ts.SyntaxKind.BarBarToken ||
    expression.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken ||
    expression.operatorToken.kind === ts.SyntaxKind.CommaToken;
  const immutableLiteralStringValue = (
    expression: tsNS.Expression,
    seen: ReadonlySet<tsNS.Identifier> = new Set<tsNS.Identifier>()
  ): string | null => {
    const value = unwrap(expression);
    if (ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value)) return value.text;
    if (!ts.isIdentifier(value)) return null;
    const declaration = resolver(value);
    if (declaration === null || seen.has(declaration)) return null;
    const variable = declaration.parent;
    if (
      !ts.isVariableDeclaration(variable) ||
      variable.name !== declaration ||
      variable.initializer === undefined ||
      !ts.isVariableDeclarationList(variable.parent) ||
      (variable.parent.flags & ts.NodeFlags.Const) === 0
    )
      return null;
    const next = new Set(seen);
    next.add(declaration);
    return immutableLiteralStringValue(variable.initializer, next);
  };
  const staticAccessName = (
    expression: tsNS.PropertyAccessExpression | tsNS.ElementAccessExpression
  ): string | null => {
    if (ts.isPropertyAccessExpression(expression)) return expression.name.text;
    const argument = expression.argumentExpression;
    return argument === undefined ? null : immutableLiteralStringValue(argument);
  };
  function factoryReferenceIsOpaque(expression: tsNS.Expression): boolean {
    const value = unwrap(expression);
    if (ts.isIdentifier(value)) {
      const declaration = resolver(value);
      return (
        declaration !== null &&
        (opaqueFactories.has(declaration) ||
          opaqueBindings.has(declaration) ||
          opaqueParameter(value))
      );
    }
    if (ts.isConditionalExpression(value))
      return factoryReferenceIsOpaque(value.whenTrue) || factoryReferenceIsOpaque(value.whenFalse);
    if (ts.isBinaryExpression(value) && isValueFlowBinary(value))
      return factoryReferenceIsOpaque(value.left) || factoryReferenceIsOpaque(value.right);
    if (ts.isCallExpression(value) || ts.isNewExpression(value)) return opaqueValue(value);
    if (!ts.isPropertyAccessExpression(value) && !ts.isElementAccessExpression(value)) return false;
    const name = staticAccessName(value);
    if (name === "bind" || name === "call" || name === "apply")
      return factoryReferenceIsOpaque(value.expression);
    return (
      (name !== null && receiverHasProperty(opaqueFactoryProperties, value.expression, name)) ||
      opaqueValue(value.expression)
    );
  }
  function functionProducesOpaque(functionLike: tsNS.FunctionLikeDeclaration): boolean {
    const returns = functionReturnExpressions(ts, functionLike);
    return (
      (functionLike.type !== undefined &&
        isOpaqueAnnotation(functionLike.type) &&
        returns.some((expression) => !isProvenValue(expression))) ||
      returns.some(opaqueValue)
    );
  }
  function opaqueCallArgument(argument: tsNS.Expression | tsNS.SpreadElement): boolean {
    return opaqueValue(ts.isSpreadElement(argument) ? argument.expression : argument);
  }
  function opaqueArrayElement(
    element: tsNS.Expression | tsNS.SpreadElement | tsNS.OmittedExpression
  ): boolean {
    return (
      !ts.isOmittedExpression(element) &&
      opaqueValue(ts.isSpreadElement(element) ? element.expression : element)
    );
  }
  function opaqueTemplateSubstitution(template: tsNS.TemplateLiteral): boolean {
    return (
      ts.isTemplateExpression(template) &&
      template.templateSpans.some((span) => opaqueValue(span.expression))
    );
  }
  function opaqueValue(expression: tsNS.Expression): boolean {
    if (
      (ts.isAsExpression(expression) ||
        ts.isTypeAssertionExpression(expression) ||
        ts.isSatisfiesExpression(expression)) &&
      isOpaqueAnnotation(expression.type) &&
      !isProvenValue(expression.expression)
    )
      return true;
    const value = unwrap(expression);
    if (ts.isIdentifier(value)) {
      const declaration = resolver(value);
      return declaration !== null && (opaqueBindings.has(declaration) || opaqueParameter(value));
    }
    if (ts.isConditionalExpression(value))
      return opaqueValue(value.whenTrue) || opaqueValue(value.whenFalse);
    if (ts.isBinaryExpression(value) && isValueFlowBinary(value))
      return opaqueValue(value.left) || opaqueValue(value.right);
    if (ts.isArrowFunction(value) || ts.isFunctionExpression(value))
      return functionProducesOpaque(value);
    if (ts.isPropertyAccessExpression(value) || ts.isElementAccessExpression(value)) {
      const name = staticAccessName(value);
      if (name !== null && receiverHasProperty(opaqueValueProperties, value.expression, name))
        return true;
      return opaqueValue(value.expression);
    }
    if (ts.isArrayLiteralExpression(value)) return value.elements.some(opaqueArrayElement);
    if (ts.isCallExpression(value) || ts.isNewExpression(value))
      return (
        value.typeArguments?.some(isOpaqueAnnotation) === true ||
        factoryReferenceIsOpaque(value.expression) ||
        opaqueValue(value.expression) ||
        value.arguments?.some(opaqueCallArgument) === true
      );
    if (ts.isTaggedTemplateExpression(value))
      return (
        value.typeArguments?.some(isOpaqueAnnotation) === true ||
        factoryReferenceIsOpaque(value.tag) ||
        opaqueValue(value.tag) ||
        opaqueTemplateSubstitution(value.template)
      );
    return false;
  }
  function operationCallArgument(argument: tsNS.Expression | tsNS.SpreadElement): boolean {
    return operationValue(ts.isSpreadElement(argument) ? argument.expression : argument);
  }
  function operationArrayElement(
    element: tsNS.Expression | tsNS.SpreadElement | tsNS.OmittedExpression
  ): boolean {
    return (
      !ts.isOmittedExpression(element) &&
      operationValue(ts.isSpreadElement(element) ? element.expression : element)
    );
  }
  function operationTemplateSubstitution(template: tsNS.TemplateLiteral): boolean {
    return (
      ts.isTemplateExpression(template) &&
      template.templateSpans.some((span) => operationValue(span.expression))
    );
  }
  function functionProducesOperation(functionLike: tsNS.FunctionLikeDeclaration): boolean {
    return functionReturnExpressions(ts, functionLike).some(operationValue);
  }
  function operationValue(expression: tsNS.Expression): boolean {
    const value = unwrap(expression);
    if (ts.isIdentifier(value)) {
      const declaration = resolver(value);
      return (
        declaration !== null &&
        (opaqueOperationBindings.has(declaration) || opaqueOperationFactories.has(declaration))
      );
    }
    if (ts.isConditionalExpression(value))
      return operationValue(value.whenTrue) || operationValue(value.whenFalse);
    if (ts.isBinaryExpression(value) && isValueFlowBinary(value))
      return operationValue(value.left) || operationValue(value.right);
    if (ts.isArrayLiteralExpression(value)) return value.elements.some(operationArrayElement);
    if (ts.isPropertyAccessExpression(value) || ts.isElementAccessExpression(value)) {
      const name = staticAccessName(value);
      return (
        operationValue(value.expression) ||
        (name !== null && receiverHasProperty(opaqueOperationProperties, value.expression, name)) ||
        (name !== null && opaqueValue(value.expression) && DATABASE_OPERATIONS.has(name))
      );
    }
    if (ts.isCallExpression(value) || ts.isNewExpression(value))
      return (
        operationValue(value.expression) || value.arguments?.some(operationCallArgument) === true
      );
    if (ts.isTaggedTemplateExpression(value))
      return operationValue(value.tag) || operationTemplateSubstitution(value.template);
    return false;
  }
  const collectObjectProperties = (
    identifier: tsNS.Identifier,
    object: tsNS.ObjectLiteralExpression
  ): boolean => {
    const values = new Set<string>();
    const factories = new Set<string>();
    const operations = new Set<string>();
    for (const property of object.properties) {
      const name = propertyName(ts, "name" in property ? property.name : undefined);
      if (name === null) continue;
      if (ts.isMethodDeclaration(property)) {
        if (functionProducesOpaque(property)) factories.add(name);
        if (functionProducesOperation(property)) operations.add(name);
      } else if (ts.isPropertyAssignment(property)) {
        if (ts.isFunctionLike(property.initializer)) {
          if (functionProducesOpaque(property.initializer)) factories.add(name);
          if (functionProducesOperation(property.initializer)) operations.add(name);
        } else {
          if (opaqueValue(property.initializer)) values.add(name);
          if (operationValue(property.initializer)) operations.add(name);
        }
      } else if (ts.isShorthandPropertyAssignment(property)) {
        if (factoryReferenceIsOpaque(property.name)) factories.add(name);
        if (opaqueValue(property.name)) values.add(name);
        if (operationValue(property.name)) operations.add(name);
      }
    }
    const valuesChanged = addProperties(opaqueValueProperties, identifier, values);
    const factoriesChanged = addProperties(opaqueFactoryProperties, identifier, factories);
    const operationsChanged = addOperationProperties(identifier, operations);
    return valuesChanged || factoriesChanged || operationsChanged;
  };
  const collectClassProperties = (declaration: tsNS.ClassDeclaration): boolean => {
    if (declaration.name === undefined) return false;
    const factories = new Set<string>();
    const operations = new Set<string>();
    for (const member of declaration.members) {
      const name = propertyName(ts, "name" in member ? member.name : undefined);
      if (name === null) continue;
      if (ts.isMethodDeclaration(member) || ts.isGetAccessorDeclaration(member)) {
        if (
          functionProducesOpaque(member) ||
          (member.body === undefined &&
            member.type !== undefined &&
            isOpaqueAnnotation(member.type))
        )
          factories.add(name);
        if (functionProducesOperation(member)) operations.add(name);
      } else if (
        ts.isPropertyDeclaration(member) &&
        ((member.type !== undefined && isOpaqueAnnotation(member.type)) ||
          (member.initializer !== undefined &&
            ts.isFunctionLike(member.initializer) &&
            functionProducesOpaque(member.initializer)))
      )
        factories.add(name);
    }
    const factoriesChanged = addProperties(opaqueFactoryProperties, declaration.name, factories);
    const operationsChanged = addOperationProperties(declaration.name, operations);
    return factoriesChanged || operationsChanged;
  };
  let changed = true;
  while (changed) {
    changed = false;
    const visit = (node: tsNS.Node): void => {
      if (ts.isClassDeclaration(node)) changed = collectClassProperties(node) || changed;
      if (ts.isFunctionLike(node)) {
        const declaration = functionBinding(ts, analysis, node as tsNS.FunctionLikeDeclaration);
        if (declaration !== null) {
          if (functionProducesOpaque(node as tsNS.FunctionLikeDeclaration))
            changed = addFactory(declaration) || changed;
          if (functionProducesOperation(node as tsNS.FunctionLikeDeclaration))
            changed = addOperationFactory(declaration) || changed;
        }
      }
      if (ts.isVariableDeclaration(node) && node.initializer !== undefined) {
        if (ts.isIdentifier(node.name)) {
          const typedOpaque =
            node.type !== undefined &&
            isOpaqueAnnotation(node.type) &&
            !isProvenValue(node.initializer);
          const initializerOpaque = opaqueValue(node.initializer);
          const initializerOperation = operationValue(node.initializer);
          if (typedOpaque || initializerOpaque) changed = addBinding(node.name) || changed;
          if (initializerOperation) changed = addOperationBinding(node.name) || changed;
          if (typedOpaque || initializerOpaque || factoryReferenceIsOpaque(node.initializer))
            changed = addFactory(node.name) || changed;
          const value = unwrap(node.initializer);
          if (ts.isObjectLiteralExpression(value))
            changed = collectObjectProperties(node.name, value) || changed;
        } else if (ts.isObjectBindingPattern(node.name)) {
          const declaration = mappedReceiverDeclaration(ts, resolver, unwrap, node.initializer);
          const initializerOpaque = opaqueValue(node.initializer);
          const initializerOperation = operationValue(node.initializer);
          for (const element of node.name.elements) {
            const name =
              element.propertyName === undefined
                ? propertyName(ts, element.name as tsNS.PropertyName)
                : propertyName(ts, element.propertyName);
            for (const identifier of bindingIdentifiers(ts, element.name)) {
              if (
                initializerOpaque ||
                (name !== null &&
                  declaration !== null &&
                  opaqueValueProperties.get(declaration)?.has(name) === true)
              )
                changed = addBinding(identifier) || changed;
              if (
                initializerOperation ||
                (name !== null &&
                  declaration !== null &&
                  opaqueOperationProperties.get(declaration)?.has(name) === true) ||
                (name !== null && initializerOpaque && DATABASE_OPERATIONS.has(name))
              )
                changed = addOperationBinding(identifier) || changed;
              if (
                factoryReferenceIsOpaque(node.initializer) ||
                (name !== null &&
                  declaration !== null &&
                  opaqueFactoryProperties.get(declaration)?.has(name) === true)
              )
                changed = addFactory(identifier) || changed;
            }
          }
        } else if (ts.isArrayBindingPattern(node.name)) {
          const initializerOpaque = opaqueValue(node.initializer);
          const initializerOperation = operationValue(node.initializer);
          for (const element of node.name.elements)
            if (!ts.isOmittedExpression(element))
              for (const identifier of bindingIdentifiers(ts, element.name)) {
                if (initializerOpaque) changed = addBinding(identifier) || changed;
                if (initializerOperation) changed = addOperationBinding(identifier) || changed;
              }
        }
      }
      if (
        ts.isBinaryExpression(node) &&
        node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
        ts.isIdentifier(node.left)
      ) {
        const declaration = resolver(node.left);
        if (declaration !== null && opaqueValue(node.right))
          changed = addBinding(declaration) || changed;
        if (declaration !== null && operationValue(node.right))
          changed = addOperationBinding(declaration) || changed;
        if (declaration !== null && factoryReferenceIsOpaque(node.right))
          changed = addFactory(declaration) || changed;
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }
  const validate = (node: tsNS.Node): void => {
    if (ts.isCallExpression(node) && operationValue(node.expression)) onInvalid();
    if (ts.isTaggedTemplateExpression(node) && operationValue(node.tag)) onInvalid();
    ts.forEachChild(node, validate);
  };
  validate(sourceFile);
}
