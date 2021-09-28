import { parentSymbol } from '../FormKit'
import {
  createNode,
  FormKitNode,
  FormKitNodeType,
  FormKitMessage,
} from '@formkit/core'
import { nodeProps } from '@formkit/utils'
import { reactive, inject, provide, watchEffect, toRef } from 'vue'
import { configSymbol } from '../plugin'
import { minConfig } from '../plugin'

/**
 * A composable for creating a new FormKit node.
 * @param type - The type of node (input, group, list)
 * @param attrs - The FormKit "props" — which is really the attrs list.
 * @returns
 */
export function useInput(
  type: FormKitNodeType,
  props: { type: string },
  attrs: Record<string, any>
): [Record<string, any>, FormKitNode] {
  const { name } = attrs
  /**
   * The configuration options, these are provided by either the plugin or by
   * explicit props.
   */
  const config = inject(configSymbol, minConfig)

  /**
   * The parent node.
   */
  const parent = inject(parentSymbol, null)

  /**
   * Define the initial component
   */
  let value = attrs.value
  if (!value) {
    if (type === 'input') value = ''
    if (type === 'group') value = {}
    if (type === 'list') value = []
  }

  /**
   * Create the FormKitNode.
   */
  const node = createNode({
    ...config.nodeOptions,
    type,
    name,
    value,
    parent,
    props: nodeProps(attrs),
  })

  /**
   * This is the reactive data object that is provided to all schemas and
   * forms. It is a subset of data in the core node object.
   */
  const data = reactive({
    type: toRef(props, 'type'),
    _value: node.value,
    value: node.value,
    node,
    messages: node.store.reduce((store, message) => {
      if (message.visible) {
        store[message.key] = message
      }
      return store
    }, {} as Record<string, FormKitMessage>),
    label: toRef(attrs, 'label'),
    help: toRef(attrs, 'help'),
    input: attrs.input
      ? toRef(attrs, 'input')
      : (e: Event) => node.input((e.target as HTMLInputElement).value),
  })

  /**
   * Watch and dynamically set prop values so both core and vue states are
   * reactive.
   */
  watchEffect(() => {
    const props = nodeProps(attrs)
    for (const propName in props) {
      node.props[propName] = props[propName]
    }
  })

  /**
   * Watch for input events from core.
   */
  node.on('input', ({ payload }) => {
    data._value = payload
  })

  /**
   * Watch for input commits from core.
   */
  node.on('commit', ({ payload }) => {
    data.value = payload
  })

  /**
   * Listen to message events and modify the local message data values.
   */
  node.on('message-added', ({ payload: message }) => {
    if (message.visible) data.messages[message.key] = message
  })
  node.on('message-removed', ({ payload: message }) => {
    delete data.messages[message.key]
  })
  node.on('message-updated', ({ payload: message }) => {
    if (message.visible) data.messages[message.key] = message
  })

  if (node.type !== 'input') {
    provide(parentSymbol, node)
  }

  console.log(data)

  return [data, node]
}
