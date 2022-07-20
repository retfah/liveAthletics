console.log('Important: async does not mean multi-threaded! Everything runs in one thread by default. But by using async, there might be some "computational time slots" where concurrent code cam be computed, which feel less slow then. However, if there is one very computationally intensive process running without async parts in it, everything else has to wait. This can (probably) only be avoided by using multiple threads, e.g. with the cluster module.');
console.log('start');

// to make an async call truly async, i.e. the content (i.e. the executor) of the async function is called after the calling function (or in parallel) 
Promise.resolve(true).then(async ()=>{ 
    takesLong();
    console.log('after take long'); // within the async function, th takesLong is sync with this line, i.e. runs before this line
});
// the following will by called in sync, since the executor of an async function itself is sync. 
//takesLong();
console.log('end');

async function asy(){
    if (true){
        // do something that takes some time
        let start = Date.now();
        let z = 0;
        for (let i=0;i<100000000;i++){
            z = (z+Math.random()) % 2;
        }
        console.log(`Unnecessary workload took ${Date.now()-start}ms.`)
    }
}

async function takesLong(){
    if (true){
        // do something that takes some time
        let start = Date.now();
        let z = 0;
        for (let i=0;i<100000000;i++){
            z = (z+Math.random()) % 2;
        }
        console.log(`Unnecessary workload took ${Date.now()-start}ms.`)
    }
}

function asy2(){
    return new Promise((resolve, reject)=>{
        let start = Date.now();
        let z = 0;
        for (let i=0;i<100000000;i++){
            z = (z+Math.random()) % 2;
        }
        console.log(`Unnecessary workload took ${Date.now()-start}ms.`)
        resolve();
    })
}


// using a resolved promise, the 'then' block will be triggered instantly,
// but its handlers will be triggered asynchronously as demonstrated by the console.logs
const resolvedProm = Promise.resolve(33);
console.log('resolved promises never have a pending state:'); 
console.log(resolvedProm);

const calcOnlyProm = new Promise((res, rej)=>{
    res(10+15);
})
console.log('the executor of a promise is directly processed; i.e. if there is no further async call inside the executor (which would mean that resolve was wthin the then of this sub-function), the Promise instantly is resolved:'); 
console.log(calcOnlyProm);


let thenProm = resolvedProm.then(value => {
    console.log("After all the other code, then of the Promises are called, one after the other: " + value);
    return value;
});
// instantly logging the value of thenProm
console.log("Since this promise is within the then of another promise, it will be executed later, even if the promise is already resolved at that time.")
console.log(thenProm);

// using setTimeout we can postpone the execution of a function to the moment the stack is empty
setTimeout(() => {
    console.log(thenProm);
});

// logs, in order:
// Promise {[[PromiseStatus]]: "pending", [[PromiseValue]]: undefined}
// "this gets called after the end of the main stack. the value received and returned is: 33"
// Promise {[[PromiseStatus]]: "resolved", [[PromiseValue]]: 33}