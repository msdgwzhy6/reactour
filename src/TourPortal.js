import React, { Component, PropTypes } from 'react'
import cn from 'classnames'
import styled from 'styled-components'
import scrollSmooth from 'scroll-smooth'
import Scrollparent from 'scrollparent'
import * as hx from './helpers'

const CN = {
  mask: {
    base: 'reactour__mask',
    isOpen: 'reactour__mask--is-open',
  },
  helper: {
    base: 'reactour__helper',
    isOpen: 'reactour__helper--is-open',
  }
}

class TourPortal extends Component {
  static propTypes = {
    className: PropTypes.string,
    current: PropTypes.number,
    delay: PropTypes.number,
    isOpen: PropTypes.bool.isRequired,
    maskClassName: PropTypes.string,
    onAfterOpen: PropTypes.func,
    onBeforeClose: PropTypes.func,
    onRequestClose: PropTypes.func,
    shouldCloseOnMaskClick: PropTypes.bool,
    steps: PropTypes.arrayOf(PropTypes.shape({
      'selector': PropTypes.string.isRequired,
      'content': PropTypes.oneOfType([
        PropTypes.node,
        PropTypes.element,
      ]).isRequired,
    })),
  }
  
  static defaultProps = {
    onAfterOpen: () => { document.body.style.overflowY = 'hidden' },
    onBeforeClose: () => { document.body.style.overflowY = 'auto' },
  }
  
  constructor () {
    super()
    this.state = {
      isOpen: false,
      current: 0,
      top: 0, 
      right: 0, 
      bottom: 0, 
      left: 0, 
      width: 0,
      height: 0, 
      w: 0, 
      h: 0,
    }
  }
  
  componentDidMount () {
    const { isOpen } = this.props
    if (isOpen) {
      this.open()
    }
  }
  
  componentWillReceiveProps (nextProps) {
    if (!this.props.isOpen && nextProps.isOpen) {
      this.open()
    } else if (this.props.isOpen && !nextProps.isOpen){
      this.close()
    }
  }
  
  open () {
    const { isOpen, onAfterOpen } = this.props
    this.setState({ isOpen: true }, () => {
      this.showStep()
      if (onAfterOpen) onAfterOpen()
    })
    // TODO: debounce it.
    window.addEventListener('resize', this.showStep);
  }
  
  showStep = () => {
    const { steps } = this.props
    const { current } = this.state
    const step = steps[current]
    const node = document.querySelector(step.selector)
    const attrs = hx.getNodeRect(node)
    const w = Math.max(document.documentElement.clientWidth, window.innerWidth || 0)
    const h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0)
    const { width: helperWidth, height: helperHeight } = hx.getNodeRect(this.helper)
    
    if (!hx.inView({...attrs, w, h })) {
      const parentScroll = Scrollparent(node)
      scrollSmooth.to(node, {
        context: hx.isBody(parentScroll) ? window : parentScroll,
        duration: 1,
        offset: -(h/2),
        callback: e => {
          this.setState({
            ...hx.getNodeRect(e), 
            w, 
            h,
            helperWidth,
            helperHeight,
            helperPosition: step.position,
          })
        }
      })
    } else {
      this.setState({
        ...attrs,
        w, 
        h,
        helperWidth,
        helperHeight,
        helperPosition: step.position,
      })
    }
  }
  
  close () {
    this.setState({
      isOpen: false,
    }, this.onBeforeClose)
    window.removeEventListener('resize', this.showStep);
  }
  
  onBeforeClose () {
    const { onBeforeClose } = this.props
    if (onBeforeClose) {
      onBeforeClose()
    }
  }
  
  maskClickHandler = e => {
    const { shouldCloseOnMaskClick, onRequestClose } = this.props
    if (shouldCloseOnMaskClick) {
      onRequestClose(e)
    }
  }
  
  nextStep = () => {
    const { steps } = this.props
    this.setState(prevState => {
      const nextStep = prevState.current < steps.length - 1 
        ? prevState.current + 1
        : prevState.current 
      return {
        current: nextStep,
      }
    }, this.showStep)
  }
  
  prevStep = () => {
    const { steps } = this.props
    this.setState(prevState => {
      const nextStep = prevState.current > 0
        ? prevState.current - 1
        : prevState.current 
      return {
        current: nextStep,
      }
    }, this.showStep)
  }
  
  render () {
    const { 
      // state
      isOpen, 
      current,
      // positions
      top: targetTop, 
      right: targetRight, 
      bottom: targetBottom, 
      left: targetLeft, 
      width: targetWidth, 
      height: targetHeight, 
      w: windowWidth, 
      h: windowHeight,
      helperWidth, 
      helperHeight,
      helperPosition,
    } = this.state
    if (isOpen) {
      return (
        <div>
          <div 
            ref={c => this.mask = c}
            onClick={this.maskClickHandler}
            className={cn(CN.mask.base, {
              [CN.mask.isOpen]: isOpen,
            })}>
            <TopMask 
              targetTop={targetTop} 
              padding={10} />
            <RightMask 
              targetTop={targetTop} 
              targetLeft={targetLeft}
              targetWidth={targetWidth}
              targetHeight={targetHeight}
              windowWidth={windowWidth}
              padding={10} />
            <BottomMask
              targetHeight={targetHeight}
              targetTop={targetTop} 
              windowHeight={windowHeight}
              padding={10} />
            <LeftMask
              targetHeight={targetHeight}
              targetTop={targetTop} 
              targetLeft={targetLeft}
              padding={10} />
          </div>
          <Helper 
            innerRef={c => this.helper = c}
            targetHeight={targetHeight}
            targetWidth={targetWidth}
            targetTop={targetTop} 
            targetRight={targetRight}
            targetBottom={targetBottom}
            targetLeft={targetLeft}
            windowWidth={windowWidth}
            windowHeight={windowHeight}
            helperWidth={helperWidth}
            helperHeight={helperHeight}
            helperPosition={helperPosition}
            padding={10}>
            { this.props.steps[current].content }
            <HelperControls>
              <button onClick={this.prevStep}>Prev</button>
              <span>...</span>
              <button onClick={this.nextStep}>Next</button>
            </HelperControls>
          </Helper>
        </div>
      )
    }
    
    return <div/>
  }
}

const Mask = styled.div`
  background-color: rgba(0,0,0,.85);
  width: 100%;
  left: 0;
  top: 0;
  height: 100%;
  position: fixed;
  z-index: 999;
`;

const calc = sum => sum < 0 ? 0 : sum

const TopMask = styled(Mask)`
  height: ${props => calc(props.targetTop - props.padding)}px
`;

const RightMask = styled(Mask)`
  top: ${props => props.targetTop - props.padding}px;
  left: ${props => props.targetLeft + props.targetWidth + props.padding}px;
  width: ${props => calc(props.windowWidth - props.targetWidth - props.targetLeft - props.padding)}px;
  height: ${props => props.targetHeight + (props.padding * 2)}px;
`;

const BottomMask = styled(Mask)`
  top: ${props => props.targetHeight + props.targetTop + props.padding}px;
  height: ${props => props.windowHeight + props.targetHeight - props.targetTop - props.padding}px;
`;

const LeftMask = styled(Mask)`
  top: ${props => props.targetTop - props.padding}px;
  width: ${props => calc(props.targetLeft - props.padding)}px;
  height: ${props => props.targetHeight + (props.padding * 2)}px;
`;

const Helper = styled.div`
  position: fixed;
  background-color: #fff;
  transition: transform .3s;
  padding: .6em;
  box-shadow: 0 .5em 3em rgba(0,0,0,.3);
  top: 0;
  left: 0;
  color: inherit;
  z-index: 99999;
  max-width: 300px;
  
  transform: ${props => {
    const { 
      targetTop, 
      targetRight, 
      targetBottom, 
      targetLeft, 
      targetWidth,
      targetHeight,
      windowWidth,
      windowHeight, 
      helperWidth, 
      helperHeight, 
      helperPosition,
      padding,
    } = props
    
    const available = {
      left: targetLeft,
      right: windowWidth - targetRight,
      top: targetTop,
      bottom: windowHeight - targetBottom,
    }
    
    const isHoriz = pos => /(left|right)/.test(pos)
    
    const couldPositionAt = helperPosition => {
      return available[helperPosition] > (
        isHoriz(helperPosition) 
        ? helperWidth + padding * 2 
        : helperHeight + padding * 2
      )
    }
    
    const bestPositionOf = positions => {
      return Object.keys(positions)
        .map(p => ({ 
          position: p,
          value: positions[p],
        }))
        .sort((a,b) => b.value - a.value)
        .map(p => p.position)
    }
    
    const autoPosition = coords => {
      const positionsOrder = bestPositionOf(available)
      for( let j = 0; j < positionsOrder.length; j++ ) {
        if (couldPositionAt(positionsOrder[j])) {
          return coords[positionsOrder[j]]
        }
      }
      return coords.center
    }
    
    const isOutsideX = val => val > windowWidth
    const isOutsideY = val => val > windowHeight
    
    const pos = helperPosition => {
      const outsideY = (targetTop + helperHeight) > windowHeight
      const hX = isOutsideX(targetLeft + helperWidth) 
        ? isOutsideX(targetRight + padding) 
          ? targetRight - helperWidth
          : targetRight - helperWidth + padding
        : targetLeft - padding
      const hY = isOutsideY(targetTop + helperHeight) 
        ? isOutsideY(targetBottom + padding) 
          ? targetBottom - helperHeight
          : targetBottom - helperHeight + padding
        : targetTop - padding
      const coords = {
        top: [ hX, targetTop - helperHeight - padding * 2 ],
        right: [ targetRight + padding * 2, hY ],
        bottom: [ hX, targetBottom + padding * 2 ],
        left: [ targetLeft - helperWidth - padding * 2, hY ],
        center: [
          windowWidth / 2 - helperWidth / 2,
          windowHeight / 2 - helperHeight / 2,
        ]
      }
      if (couldPositionAt(helperPosition)) {
        return coords[helperPosition]
      } 
      return autoPosition(coords)
    }
    
    const p = pos(helperPosition)
    
    return `translate(${p[0]}px, ${p[1]}px)`
  }}
`;

const HelperControls = styled.div`
  display: flex;
  justify-content: space-between;
`;

export default TourPortal
