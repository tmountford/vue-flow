// ***********************************************************
// This example support/component.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import necessary styles
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'

// Import commands.js using ES2015 syntax:
import './commands'

// Alternatively you can use CommonJS syntax:
// require('./commands')

import { mount } from 'cypress/vue'
import { VueFlow } from '@vue-flow/core'
import type { FlowProps } from '@vue-flow/core'

const mountVueFlow = (props?: FlowProps, attrs?: Record<string, any>) => {
  cy.mount(VueFlow as any, {
    props: {
      id: 'test',
      fitViewOnInit: true,
      ...props,
    } as FlowProps,
    attrs: {
      key: 'flowy',
      style: {
        height: '100vh',
        width: '100vw',
      },
      ...attrs,
    } as Record<string, any>,
  })
}

const useViewPort = () => cy.get('.vue-flow__viewport')

const useTransformationPane = () => cy.get('.vue-flow__transformationpane')

const retry = (assertion: Function, { interval = 20, timeout = 1000 } = {}) => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now()

    const tryAgain = () => {
      setTimeout(() => {
        try {
          resolve(assertion())
        } catch (err) {
          Date.now() - startTime > timeout ? reject(err) : tryAgain()
        }
      }, interval)
    }

    tryAgain()
  })
}

// Augment the Cypress namespace to include type definitions for
// your custom command.
// Alternatively, can be defined in cypress/support/component.d.ts
// with a <reference path="./component" /> at the top of your spec.
declare global {
  namespace Cypress {
    interface Chainable {
      mount: typeof mount
      vueFlow: typeof mountVueFlow
      viewPort: typeof useViewPort
      transformationPane: typeof useTransformationPane
      tryAssertion: typeof retry
    }
  }
}

Cypress.Commands.add('mount', mount)

Cypress.Commands.add('vueFlow', mountVueFlow)

Cypress.Commands.add('viewPort', useViewPort)

Cypress.Commands.add('transformationPane', useTransformationPane)

Cypress.Commands.add('tryAssertion', retry)

// Example use:
// cy.mount(MyComponent)
