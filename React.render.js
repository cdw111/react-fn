let nextUnitOfWork = null;

function perforUnitOfWork(fiber) {
    //执行任务单元 虚拟dom 转化成 真实dom
    if(!fiber.dom) {
        fiber.dom = createDom(fiber)
    }
    if(fiber.parent) {
        fiber.parent.dom.appenchild(fiber.dom);
    }
    //为当前的fiber创建其他子节点的fiber
    // fiber parent child sibling  fiber架构

    
    const elements = fiber?.props?.children;
    let preSibling = null;
    elements.forEach((childrenElement,index) => {
        const newFiber = {
            parent: fiber,
            props: childrenElement.props,
            type: childrenElement.type,
            dom: null,
        }

        if(index === 0) {
            fiber.child = newFiber;
        } else {
            preSibling.sibling = newFiber;
        }

        preSibling = newFiber;
    })



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

function workLoop() {

    let shouldYield = true;

    while(nextUnitOfWork && shouldYield) {

        nextUnitOfWork = perforUnitOfWork(nextUnitOfWork)
        shouldYield = deadline.timeRemaining() > 1;//获取当前帧剩余时间
    }

    
    requestIdleCallback(workLoop);
}

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
    nextUnitOfWork = {
        dom: container,
        props: {
            children: [element]
        }
    }
}

