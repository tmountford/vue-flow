<script lang="ts" setup>
import type { NodeChange, NodeDimensionChange, NodePositionChange } from '@vue-flow/core'
import { NodeIdInjection, useGetPointerPosition, useVueFlow } from '@vue-flow/core'
import { select } from 'd3-selection'
import { drag } from 'd3-drag'
import type { OnResize, OnResizeStart, ResizeControlProps, ResizeDragEvent } from './types'
import { ResizeControlVariant } from './types'
import { getDirection } from './utils'

const props = withDefaults(defineProps<ResizeControlProps>(), {
  variant: 'handle' as ResizeControlVariant,
  minWidth: 10,
  minHeight: 10,
})

const emits = defineEmits<{
  (event: 'resizeStart', resizeEvent: OnResizeStart): void
  (event: 'resize', resizeEvent: OnResize): void
  (event: 'resizeEnd', resizeEvent: OnResizeStart): void
}>()

const initPrevValues = { width: 0, height: 0, x: 0, y: 0 }

const initStartValues = {
  ...initPrevValues,
  pointerX: 0,
  pointerY: 0,
}

const contextNodeId = inject(NodeIdInjection, null)

const resizeControlRef = ref<HTMLDivElement>()

const id = computed(() => (typeof props.nodeId === 'string' ? props.nodeId : contextNodeId))

const { findNode, emits: triggerEmits } = useVueFlow()

const startValues = ref<typeof initStartValues>(initStartValues)
const prevValues = ref<typeof initPrevValues>(initPrevValues)

const aspectRatio = computed(() => {
  if (props.keepAspectRatio === true && startValues.value.width && startValues.value.height) {
    return startValues.value.width / startValues.value.height
  }

  if (typeof props.keepAspectRatio == 'number') {
    return props.keepAspectRatio
  }

  return undefined
})

const getPointerPosition = useGetPointerPosition()
const defaultPosition = computed(() => (props.variant === ResizeControlVariant.Line ? 'right' : 'bottom-right'))
const controlPosition = computed(() => props.position ?? defaultPosition.value)

watchEffect((onCleanup) => {
  if (!resizeControlRef.value || !id.value) {
    return
  }

  const selection = select(resizeControlRef.value)

  const dragHandler = drag<HTMLDivElement, unknown>()
    .on('start', (event: ResizeDragEvent) => {
      const node = findNode(id.value!)
      const { xSnapped, ySnapped } = getPointerPosition(event)

      prevValues.value = {
        width: node?.dimensions.width ?? 0,
        height: node?.dimensions.height ?? 0,
        x: node?.position.x ?? 0,
        y: node?.position.y ?? 0,
      }

      startValues.value = {
        ...prevValues.value,
        pointerX: xSnapped,
        pointerY: ySnapped,
      }

      emits('resizeStart', { event, params: prevValues.value })
    })
    .on('drag', (event: ResizeDragEvent) => {
      const { xSnapped, ySnapped } = getPointerPosition(event)
      const node = findNode(id.value!)
      const enableX = controlPosition.value.includes('right') || controlPosition.value.includes('left')
      const enableY = controlPosition.value.includes('bottom') || controlPosition.value.includes('top')
      const invertX = controlPosition.value.includes('left')
      const invertY = controlPosition.value.includes('top')

      if (node) {
        const changes: NodeChange[] = []
        const {
          pointerX: startX,
          pointerY: startY,
          width: startWidth,
          height: startHeight,
          x: startNodeX,
          y: startNodeY,
        } = startValues.value

        const { x: prevX, y: prevY, width: prevWidth, height: prevHeight } = prevValues.value

        const distX = Math.floor(enableX ? xSnapped - startX : 0)
        const distY = Math.floor(enableY ? ySnapped - startY : 0)

        let width = Math.max(startWidth + (invertX ? -distX : distX), props.minWidth)
        let height = Math.max(startHeight + (invertY ? -distY : distY), props.minHeight)

        if (aspectRatio.value) {
          const currentAspectRatio = width / height
          if (currentAspectRatio !== aspectRatio.value) {
            const newWidth = height * aspectRatio.value
            const newHeight = width / aspectRatio.value

            if (distX > distY) {
              height = Math.max(newHeight, props.minHeight)
            } else {
              width = Math.max(newWidth, props.minWidth)
            }
          }
        }

        const isWidthChange = width !== prevWidth
        const isHeightChange = height !== prevHeight

        if (invertX || invertY) {
          const x = invertX ? startNodeX - (width - startWidth) : startNodeX
          const y = invertY ? startNodeY - (height - startHeight) : startNodeY

          // only transform the node if the width or height changes
          const isXPosChange = x !== prevX && isWidthChange
          const isYPosChange = y !== prevY && isHeightChange

          if (isXPosChange || isYPosChange) {
            const positionChange: NodePositionChange = {
              id: node.id,
              type: 'position',
              from: node.position,
              position: {
                x: isXPosChange ? x : prevX,
                y: isYPosChange ? y : prevY,
              },
            }

            changes.push(positionChange)

            prevValues.value.x = positionChange.position!.x
            prevValues.value.y = positionChange.position!.y
          }
        }

        if (isWidthChange || isHeightChange) {
          const dimensionChange: NodeDimensionChange = {
            id: id.value!,
            type: 'dimensions',
            updateStyle: true,
            resizing: true,
            dimensions: {
              width,
              height,
            },
          }

          changes.push(dimensionChange)

          prevValues.value.width = width
          prevValues.value.height = height
        }

        if (changes.length === 0) return

        const direction = getDirection({
          width: prevValues.value.width,
          prevWidth,
          height: prevValues.value.height,
          prevHeight,
          invertX,
          invertY,
        })

        const nextValues = { ...prevValues.value, direction }

        const callResize = props.shouldResize?.(event, nextValues)

        if (callResize === false) return

        emits('resize', { event, params: nextValues })

        triggerEmits.nodesChange(changes)
      }
    })
    .on('end', (event: ResizeDragEvent) => {
      const dimensionChange: NodeDimensionChange = {
        id: id.value!,
        type: 'dimensions',
        resizing: false,
      }

      emits('resizeEnd', { event, params: prevValues.value })

      triggerEmits.nodesChange([dimensionChange])
    })

  selection.call(dragHandler)

  onCleanup(() => {
    selection.on('.drag', null)
  })
})

const positionClassNames = computed(() => controlPosition.value.split('-'))
const colorStyleProp = computed(() => (props.variant === ResizeControlVariant.Line ? 'borderColor' : 'backgroundColor'))
const controlStyle = computed(() => (props.color ? { [colorStyleProp.value]: props.color } : {}))
</script>

<script lang="ts">
export default {
  name: 'ResizeControl',
  compatConfig: { MODE: 3 },
}
</script>

<template>
  <div
    ref="resizeControlRef"
    class="vue-flow__resize-control nodrag"
    :class="[...positionClassNames, variant]"
    :style="controlStyle"
  >
    <slot />
  </div>
</template>
