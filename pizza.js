import { Console } from "console";
import { Order, Customer, Item, Payment, NearbyStores, Menu, Tracking } from "dominos";
import * as readWrite from 'fs';
import * as consoleReadline from 'readline';

let firstName;
let lastName;
let phoneNumber;
let creditCardNumber;
let creditCardExpiration;
let creditSecurityCode;
let creditPostalCode;
let userAddress;
let email;
let localStoreId;

orderPizza();

async function orderPizza() {

    await grabUserDetails();
    
    const customer = getCustomerInfo();

    let weCanOrder = await canWeOrder(customer.address);

    if(!weCanOrder) {
        console.log('Sorry - it looks we cannot place an order 😥');
        return;
    }

    let menu = await new Menu(parseInt(localStoreId));
    if(menu.menu.coupons.products['9193'] != undefined)
    {          
        const order=new Order(customer);

        await buildOrder(order);        
        await order.validate();
        await order.price();
        addPaymentMethod(order);
        //separates order from script text
        console.log(order);   
        console.log(`\n---------------------------------------`);  

        //below you will see a hack in order to prepend javascript string interpolation with money signs
        let userInput = await askForUserInput(`Domino's reports the wait time will be: ${order.estimatedWaitMinutes} minutes.
        The total price of your order is: ${'$'}${order.amountsBreakdown.customer}        
        You saved ${'$'}${order.amountsBreakdown.savings}
        Please review full order above - if needed.
        Would you like to place your order? Y or N: `
        );

        if(userInput.toLowerCase() == 'n')
        {
            console.log('Ok - I will not place your order. Script completed. ✔️');
            return;
        }

        await placeOrder(order);
        await trackOrder();
        Console.log('Script Completed. ✔️');
    }
    else 
    {
        console.log('They do not currently have your favorite deal 😥 Ending script.');
        return;
    }
}

async function placeOrder(order) {   

    console.log('Got it! Placing order... 😀');

    try {
        await order.place();
    
        console.log('\n\nOrder Placed 🍕\n\n');
        console.dir(order,{depth:3});    
    }
    catch(err) {
        console.trace(err);
        console.log(order.placeResponse);
        console.log('Looks like the order failed with the reponse above.. 😥');
    }
}

async function trackOrder()
{
    const tracking=new Tracking();
    const trackingResult=await tracking.byPhone(phoneNumber);
    console.log(`Your order will be ready in ${trackingResult.estimatedWaitMinutes} minutes - Enjoy! 😋`);
}

async function grabUserDetails() {
    let details;

    readWrite.readFile('userDetails.json', (error, file) => 
    {
        if(error) throw error;

        details = JSON.parse(file);
    });   

    //we need to wait for the file to read - I tried running readFileSync, but I always encountered an error
    await new Promise((resolve) => {
        setTimeout(resolve, 1000);
    });

    firstName = details[0].FirstName;
    lastName = details[0].LastName;
    phoneNumber = details[0].PhoneNumber;
    creditCardNumber = details[0].CreditCardNumber;
    creditCardExpiration = details[0].CreditCardExpiration;
    creditSecurityCode = details[0].CreditSecurityCode;
    creditPostalCode = details[0].CreditPostalCode;
    userAddress = details[0].Address;
    email = details[0].Email;
    localStoreId = details[0].LocalStore;
}

async function askForUserInput(message) {
    let response = '';
    const readLine = consoleReadline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    await new Promise(resolve => readLine.question(message, userResponse => {
        readLine.close();
        resolve(response = userResponse);
    }));

      return response;
}



function addPaymentMethod(order) {   

    const myCard=new Payment(
        {
            amount:order.amountsBreakdown.customer,
            number: creditCardNumber,
            expiration: creditCardExpiration,
            securityCode: creditSecurityCode,
            postalCode: creditPostalCode,
            tipAmount: 0
        }
    )
    
    order.payments.push(myCard);  
}

async function buildOrder(order) {

    order.storeID=4691;
    order.coupons = [{Code: '9193'}];

    const pizza=new Item(
        {
            //12 inch hand tossed crust
            code:'12SCREEN',
            options:{
                //sauce, whole pizza : normal
                X: {'1/1' : '1'}, 
                //cheese, whole pizza  : normal 
                C: {'1/1' : '1'},
                //pepperoni, whole pizza : normal 
                P: {'1/1' : '1'},
                //jalapeno, half pizza : normal 
                J: {'1/2': '1'},
                //bacon, half pizza : normal 
                K: {'2/2': '1'}
            }
        }
    );

    const cookieBrownie=new Item(
        {                
            code:'F_MRBRWNE'
        }
    );

    const cheesyBread=new Item(
        {                
            code:'B8PCSCB'
        }
    );

    const marinara=new Item(
        {                
            code:'MARINARA'
        }
    );

    let userInput = await askForUserInput('Would you like the Cookie Brownie or Cheesy Bread? Type Bread or Cookie: ');
    console.log('Got it! Finishing up building the order...')

    switch(userInput.toLowerCase().trim()) {
        case 'cookie': order.addItem(cookieBrownie); break;
        case 'bread': 
        order.addItem(cheesyBread);
        order.addItem(marinara);
        break;
    }

    order.addItem(pizza);
    order.serviceMethod = 'Carryout';
}

async function canWeOrder(orderAddress) {
    //you can use this find a domino's near you
    const nearbyStores = await new NearbyStores(orderAddress);
    
    let weCanOrder = false;

    //we can change this to a traditional for loop in order to break once we find our store for performance, will implement at a later time
    nearbyStores.stores.forEach(store => 
    {
        //we only want to order from store number 4691
        if(store.StoreID === localStoreId) {
            if(store.IsOnlineCapable && store.IsOnlineNow && store.IsOpen && store.ServiceIsOpen.Carryout) {
                weCanOrder = true;             
                console.log(`Yay! Your store is open and they have your favorite deal! Building order...`);
            }
        }
    });

    return weCanOrder;
}

function getCustomerInfo() {
    return new Customer(
        {
            address: userAddress,
            firstName: firstName,
            lastName: lastName,
            phone: phoneNumber,
            email: email
        }
    );
}
