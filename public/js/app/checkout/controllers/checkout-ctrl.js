/**
 * [y] hybris Platform
 *
 * Copyright (c) 2000-2014 hybris AG
 * All rights reserved.
 *
 * This software is the confidential and proprietary information of hybris
 * ("Confidential Information"). You shall not disclose such Confidential
 * Information and shall use it only in accordance with the terms of the
 * license agreement you entered into with hybris.
 */

'use strict';

angular.module('ds.checkout')

    .controller('CheckoutCtrl', [ '$scope', '$location', '$anchorScroll', 'CheckoutSvc', 'cart', 'order',
        function ($scope, $location, $anchorScroll, CheckoutSvc, cart, order) {


        $scope.order = order;
        $scope.cart = cart;

        $scope.badEmailAddress = false;
        $scope.showPristineErrors = false;
        $scope.message = null;

        $scope.submitIsDisabled = false;

        var defaultErrorMsg = 'Please correct the errors above before placing your order.';
        var invalidCCExpDateMsg = 'Invalid Expiration Date.';

        var Wiz = function(){
            this.step1Done = false;
            this.step2Done = false;
            this.step3Done = false;
            this.shipToSameAsBillTo = true;
            this.years = [];
            for (var year = new Date().getFullYear(), i = year, stop = year+10; i< stop; i++){
                this.years.push(i);
            }
        };

        $scope.wiz = new Wiz();

        $scope.billToDone = function (billToFormValid, form) {
            $scope.$broadcast('submitting:form', form);
            if(billToFormValid) {
                $scope.wiz.step1Done = true;
                $scope.showPristineErrors = false;
                if($scope.wiz.shipToSameAsBillTo){
                    $scope.setShipToSameAsBillTo();
                }

                // guarantee correct scrolling for mobile
                $location.hash('step2');
                $anchorScroll();
            } else {
                $scope.showPristineErrors = true;
            }
        };

        $scope.shipToDone = function (shipToFormValid, form) {
            $scope.$broadcast('submitting:form', form);
            // if the ship to form fields are hidden, angular considers them empty - work around that:
            if(shipToFormValid || $scope.wiz.shipToSameAsBillTo) {
                $scope.wiz.step2Done = true;
                $scope.showPristineErrors = false;
                // guarantee correct scrolling for mobile
                $location.hash('step3');
                $anchorScroll();
            } else {
                $scope.showPristineErrors = true;
            }
        };

        $scope.paymentDone = function (paymentFormValid, form){
            $scope.$broadcast('submitting:form', form);
            if(paymentFormValid) {
                $scope.wiz.step3Done = true;
                // guarantee correct scrolling for mobile
                $location.hash('step4');
                $anchorScroll();
            } else {
                $scope.showPristineErrors = true;
            }

        };

        $scope.editBillTo = function() {
            $scope.wiz.step1Done = false;
            $scope.wiz.step2Done = false;
            $scope.wiz.step3Done = false;
        };

        $scope.editShipTo = function() {
            $scope.wiz.step2Done = false;
            $scope.wiz.step3Done = false;
        };

        $scope.editPayment = function() {
            $scope.wiz.step3Done = false;
        };

        $scope.setShipToSameAsBillTo = function (){
            angular.copy($scope.order.billTo, $scope.order.shipTo);
        };

        $scope.resetExpDateErrors = function () {
            $scope.checkoutForm.paymentForm.expDateMsg = '';
            $scope.checkoutForm.paymentForm.expMonth.$setValidity('validation', true);
            $scope.checkoutForm.paymentForm.expYear.$setValidity('validation', true);
            $scope.message = '';
        };

        $scope.resetErrorMsg = function(field){
            field.$setValidity('validation', true);
            field.msg = '';
            $scope.message = '';
        };

        function onCheckoutFailure(error) {
            $scope.message = error;
            $scope.submitIsDisabled = false;
            // TODO - ideally we'd be setting the cursor/splash screen through CSS manipulation/(root?) scope property or event
            document.body.style.cursor = 'auto';
        }

        function isFieldAttributableStripeError(error) {
           return error.code.indexOf('number') !== -1 ||
                error.code.indexOf('month') !== -1 ||
                error.code.indexOf('year') !== -1 ||
                error.code.indexOf('cvc') !== -1;
        }

        function attributeStripeFieldError(error) {
            if(error.code.indexOf('number') !== -1) {
                $scope.checkoutForm.paymentForm.ccNumber.$setValidity('validation', false);
                $scope.checkoutForm.paymentForm.ccNumber.msg = error.message;
            } else if(error.code.indexOf('month') !== -1 || error.code.indexOf('year') !== -1) {
                $scope.checkoutForm.paymentForm.expMonth.$setValidity('validation', false);
                $scope.checkoutForm.paymentForm.expYear.$setValidity('validation', false);
                $scope.checkoutForm.paymentForm.expDateMsg = invalidCCExpDateMsg;

            } else if (error.code.indexOf('cvc') !== -1 ){
                $scope.checkoutForm.paymentForm.cvc.$setValidity('validation', false);
                $scope.checkoutForm.paymentForm.cvc.msg = error.message;
            }
        }

        function onStripeValidationFailure(error) {

            var msg = error.message;
            if (error.type === 'card_error') {
                $scope.editPayment();
                if (error.code && isFieldAttributableStripeError(error)) {
                    msg = defaultErrorMsg;
                    attributeStripeFieldError(error);
                }
            }
            else if (error.type === 'payment_token_error') {
                $scope.editPayment();
                msg = 'Server error - missing payment configuration key.  Please try again later.';
            } else {
                console.error('Stripe validation failed: ' + JSON.stringify(error));
                msg = 'Not able to pre-validate payment at this time.';
            }
            $scope.message = msg;
            $scope.submitIsDisabled = false;
            if ($scope.$root.$$phase !== '$apply' && $scope.$root.$$phase !== '$digest')
            {
                $scope.$apply();
            }
            // TODO - ideally we'd be setting the cursor/splash screen through CSS manipulation/(root?) scope property or event
            document.body.style.cursor = 'auto';
        }

        $scope.placeOrder = function (formValid, form) {
            $scope.message = null;
            $scope.$broadcast('submitting:form', form);
            if (formValid) {
                document.body.style.cursor = 'wait';
                $scope.submitIsDisabled = true;
                if ($scope.wiz.shipToSameAsBillTo) {
                    $scope.setShipToSameAsBillTo();
                }
                $scope.order.cart = $scope.cart;
                CheckoutSvc.checkout($scope.order, onStripeValidationFailure, onCheckoutFailure);

            }  else {
                $scope.showPristineErrors = true;
                $scope.message = defaultErrorMsg;
            }
        };
    }]);
