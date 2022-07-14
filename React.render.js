let nextUnitOfWork = null;

let workRoot = null;

let currentRoot = null;

let deletes = [];

let wipFiber = [];

let hooksIndex = 0;


function reconclieChildren(fiber,elements) {
    let index = 0;
    let preSibling = null;
    let oldFiber = fiber.alternate && fiber.alternate.child
    while(index < elements.length || oldFiber) {
        let newFiber = null;
        elements.forEach((childrenElement,index) => {
            const sameType = oldFiber && childrenElement && childrenElement.type === oldFiber.type;

            if(sameType) {
                newFiber = {
                    type: oldFiber.type,
                    props: childrenElement.props,
                    dom: oldFiber.dom,
                    parent: fiber,
                    alternate: oldFiber,
                    effectTag: 'UPDATE'
                }
            }

            if(!sameType && childrenElement) {
                newFiber = {
                    type: childrenElement.type,
                    props: childrenElement.props,
                    dom: null,
                    parent: fiber,
                    alternate: null,
                    effectTag: 'PLACEMENT'
                }
            }

            if(!sameType && oldFiber) {
                oldFiber.effectTag = 'DELETE'
                deletes.push(oldFiber)
            }

            oldFiber = oldFiber.sibling;

            if(index === 0) {
                fiber.child = newFiber;
            } else {
                preSibling.sibling = newFiber;
            }

            preSibling = newFiber;
        })
        index++;
    }
    

}

function updatehHostComponent(fiber) {
        //执行任务单元 虚拟dom 转化成 真实dom
        if(!fiber.dom) {
            fiber.dom = createDom(fiber)
        }
        // if(fiber.parent) {
        //     fiber.parent.dom.appenchild(fiber.dom);
        // }
        //为当前的fiber创建其他子节点的fiber
        // fiber parent child sibling  fiber架构
    
        
        const elements = fiber?.props?.children;
        // let preSibling = null;
        // elements.forEach((childrenElement,index) => {
        //     const newFiber = {
        //         parent: fiber,
        //         props: childrenElement.props,
        //         type: childrenElement.type,
        //         dom: null,
        //     }
    
        //     if(index === 0) {
        //         fiber.child = newFiber;
        //     } else {
        //         preSibling.sibling = newFiber;
        //     }
    
        //     preSibling = newFiber;
        // })
    
        reconclieChildren(fiber,elements);
}

function useState(initial) {
    //上一次的hooks的值
    const preHooks =  wipFiber?.alternate?.hooks?.[hooksIndex]?.state

    const hook = {
        state: preHooks ? preHooks.state : initial,
        queue: [],
    }

    const actions = preHooks ? preHooks.queue : [];
    actions.forEach(action => {
        hook.state = action
    })
    const setState = action => {
        hook.queue.push(action)
        workRoot = {
            dom: currentRoot.dom,
            props: currentRoot.props,
            alternate: currentRoot,
        }
    
        nextUnitOfWork = workRoot;
        deletes = [];
    }
    wipFiber.hooks.push(hook)
    hooksIndex++;

    return [hook.state,setState]


}

function updateFunctionComponent(fiber) {
    wipFiber = fiber;
    wipFiber.hooks = [];
    hooksIndex = 0;
    const children = [fiber.type(fiber.props)];
    reconclieChildren(fiber,children)
}

function perforUnitOfWork(fiber) {
    //判断函数组件
    if(fiber.type instanceof Function) {
        updateFunctionComponent(fiber)
    }else {
        updatehHostComponent(fiber)
    }

    //return 下一个任务单元
    if(fiber.child) {
        return fiber.child
    }

    let nextFiber = fiber;
    while(nextFiber) {
        if(nextFiber.sibling) {
            return nextFiber.sibling
        }
        nextFiber = nextFiber.parent
    }
}
//是否为事件监听
const isEvent = key => key.startsWith('on');
//筛选需要移除的属性
const removeProps = (pre,next) => key => !(key in next)
//选择出新的属性
const newProps = (pre,next) => key => pre[key] !== next[key]
function updateDom(dom,preProps,nextProps) {
    const isProperty = key => key !== 'children' && !isEvent(key)
    //更新事件
    //移除
    Object.keys(element?.props)
        .filter(isEvent)
        .filter(key => removeProps(preProps,newProps)(key) || newProps(preProps,newProps)(key))
        .forEach(name => {
            const eventType = name.toLocaleLowerCase().substring(2);
            dom.removeEventListener(
                eventType,
                preProps[name]
            )
        })
    //新增
    Object.keys(element?.props)
        .filter(isEvent)
        .filter(newProps(preProps,newProps))
        .forEach(name => {
            const eventType = name.toLocaleLowerCase().substring(2);
            dom.addEventListener(
                eventType,
                preProps[name]
            )
        })
    //移除
    Object.keys(element?.props)
        .filter(isProperty)
        .filter(removeProps(preProps,newProps))
        .forEach(name => dom[name] = '')
    //新增
    Object.keys(element?.props)
        .filter(isProperty)
        .filter(newProps(preProps,newProps))
        .forEach(name => dom[name] = nextProps[name])
}

function commitDelete(fiber,parentDom) {
    if(fiber.dom) {
        parentDom.removeChild(fiber,dom)
    }else {
        commitDelete(fiber.child,parentDom)
    }
}

function commitWork(fiber) {
    if(!fiber) return

    //const parentDom = fiber.parent.dom;
    let domParentFiber = fiber.parent;
    while(!domParentFiber.dom) {
        domParentFiber = domParentFiber.parent;
    }
    const parentDom = domParentFiber.dom;
    switch(fiber.effectTag) {
        case 'PLACEMENT' :
            fiber.dom && parentDom.appendChild(dom);
            break;
        case 'UPDATE' :
            fiber.dom && updateDom(fiber.dom,fiber.alternate,fiber.props);
            break;
        case 'DELETE' :
            //fiber.dom && parentDom.removeChild(dom);
            commitDelete(fiber,parentDom);
            break;
        default :
            break;
    }
    // parentDom.appendChild(fiber.dom);
    commitWork(fiber.child);
    commitWork(fiber.sibling);
}

function commitRoot() {
    //渲染真实dom
    commitWork(workRoot.child)
    deletes.forEach(commitWork)
    currentRoot = workRoot;
    workRoot = null;
}

function workLoop() {

    let shouldYield = true;

    while(nextUnitOfWork && shouldYield) {

        nextUnitOfWork = perforUnitOfWork(nextUnitOfWork)
        shouldYield = deadline.timeRemaining() > 1;//获取当前帧剩余时间
    }

    if(!nextUnitOfWork && workRoot) {
        commitRoot()
    }

    requestIdleCallback(workLoop);
}
requestIdleCallback(workLoop);
function createDom() {
    //创建daom元素
    const dom = element.type === 'Text_ELEMENT'
        ? document.createTextNode('')
        : document.createElement(element.type)
    //添加属性
    const isProperty = key => key !== 'children'
    Object.keys(element?.props)
        .filter(isProperty)
        .forEach(name => dom[name] = element.props[name])
    // //递归子元素
    // element?.props?.children.array.forEach(child => {
    //     render(child)
    // });
    // //加入
    // container.appendchild(dom)
    return dom
}

function render(element, container) {
    // nextUnitOfWork = {
    //     dom: container,
    //     props: {
    //         children: [element]
    //     }
    // }
    workRoot = {
        dom: container,
        props: {
            children: [element]
        },
        alternate: currentRoot,
    }

    nextUnitOfWork = workRoot;
    deletes = [];
}

