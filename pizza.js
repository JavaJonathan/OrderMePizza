import { Order, Customer, Item, Payment, NearbyStores, Menu } from "dominos";
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

orderPizza();

async function grabUserDetails() {
    let details;

    readWrite.readFile('userDetails.json', (error, file) => 
    {
        if(error) throw error;

        details = JSON.parse(file);
    })   

    //we need to wait for the file to read - I tried running readFileSync, but I always encountered an error
    await new Promise((resolve) => {
        setTimeout(resolve, 1000);
    })

    firstName = details[0].FirstName;
    lastName = details[0].LastName;
    phoneNumber = details[0].PhoneNumber;
    creditCardNumber = details[0].CreditCardNumber;
    creditCardExpiration = details[0].CreditCardExpiration;
    creditSecurityCode = details[0].CreditSecurityCode;
    creditPostalCode = details[0].CreditPostalCode;
    userAddress = details[0].Address;
    email = details[0].Email;
}

async function askForUserInput(message) {
    let response = ''
    const readLine = consoleReadline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    await new Promise(resolve => readLine.question(message, userResponse => {
        readLine.close();
        resolve(response = userResponse);
      }));

      return response
}

async function orderPizza() {

    await grabUserDetails();
    
    const customer = getCustomerInfo();

    let weCanOrder = await canWeOrder(customer.address);

    if(!weCanOrder) {
        console.log('Sorry - it looks we cannot place an order :(')
    }

    console.log('Yay! Your store is open! I will place your order now.')

    let menu = await new Menu(4691);
    if(menu.menu.coupons.products['9193'] != undefined)
    {
        const order=new Order(customer);
        order.storeID=4691;
        order.coupons = [{Code: '9193'}];

        const pizza=new Item(
            {
                //16 inch hand tossed crust
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

        order.addItem(pizza);
        order.addItem(cheesyBread);
        order.serviceMethod = 'Carryout'
        
        await order.validate();
        await order.price();

        const myCard=new Payment(
            {
                amount:order.amountsBreakdown.customer,
                
                // dashes are not needed, they get filtered out
                number:'4100-1234-2234-3234',
                
                //slashes not needed, they get filtered out
                expiration:'01/35',
                securityCode:'867',
                postalCode:'93940',
                tipAmount:0
            }
        )
        order.payments.push(myCard);     

        let userInput = await askForUserInput(`Domino's reports the wait time will be: ${order.estimatedWaitMinutes}. Would you like to place your order? Y or N: `);

        if(userInput.toLowerCase() == 'n')
        {
            console.log('Ok - I will not place your order. Script completed.')
            return
        }

        console.log(order);

        // try {
        //     //will throw a dominos error because
        //     //we used a fake credit card
        //     await order.place();
        
        //     console.log('\n\nPlaced Order\n\n');
        //     console.dir(order,{depth:3});
        
        // }
        // catch(err) {
        //     console.trace(err);
        
        //     //inspect Order Response to see more information about the 
        //     //failure, unless you added a real card, then you can inspect
        //     //the order itself
        //     console.log('\n\nFailed Order Probably Bad Card, here is order.priceResponse the raw response from Dominos\n\n');
        //     console.dir(
        //         order.placeResponse,
        //         {depth:5}
        //     );
        // }
    }
}

async function canWeOrder(orderAddress) {
    //you can use this find a domino's near you
    const nearbyStores = await new NearbyStores(orderAddress);
    
    let weCanOrder = false;

    //we can change this to a traditional for loop in order to break once we find our store for performce, will implement at a later time
    nearbyStores.stores.forEach(store => 
    {
        //we only want to order from store number 4691
        if(store.StoreID === '4691')
        {
            if(store.IsOnlineCapable && store.IsDeliveryStore && store.IsOpen && store.ServiceIsOpen.Delivery) {
                weCanOrder = true;
            }
        }
    });

    return weCanOrder
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
