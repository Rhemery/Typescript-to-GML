// Shared by the JavaScript contract test and the real GameMaker VM fixture.
// Sixteen factory levels mix arrows and ordinary functions; the leaf callbacks
// capture all levels, and sibling branches deliberately share only some of them.
function closureContractDeep(__ts2gml_capture_1_parameter) {
    var __ts2gml_env_1 = { __ts2gml_capture_1: __ts2gml_capture_1_parameter };
    var readSeed = method({ __ts2gml_env_1: __ts2gml_env_1, __ts2gml_closure: true }, function () {
        var __ts2gml_env_1 = self.__ts2gml_env_1;
        return __ts2gml_env_1.__ts2gml_capture_1;
    });
    var branch = method({ __ts2gml_env_1: __ts2gml_env_1, __ts2gml_closure: true }, function (__ts2gml_capture_2_parameter) {
        var __ts2gml_env_1 = self.__ts2gml_env_1;
        var __ts2gml_env_3 = { __ts2gml_capture_2: __ts2gml_capture_2_parameter };
        return method({ __ts2gml_env_1: __ts2gml_env_1, __ts2gml_env_3: __ts2gml_env_3, __ts2gml_closure: true }, function (__ts2gml_capture_3_parameter) {
            var __ts2gml_env_1 = self.__ts2gml_env_1;
            var __ts2gml_env_3 = self.__ts2gml_env_3;
            var __ts2gml_env_4 = { __ts2gml_capture_3: __ts2gml_capture_3_parameter };
            return method({ __ts2gml_env_1: __ts2gml_env_1, __ts2gml_env_3: __ts2gml_env_3, __ts2gml_env_4: __ts2gml_env_4, __ts2gml_closure: true }, function (__ts2gml_capture_4_parameter) {
                var __ts2gml_env_1 = self.__ts2gml_env_1;
                var __ts2gml_env_3 = self.__ts2gml_env_3;
                var __ts2gml_env_4 = self.__ts2gml_env_4;
                var __ts2gml_env_5 = { __ts2gml_capture_4: __ts2gml_capture_4_parameter };
                return method({ __ts2gml_env_1: __ts2gml_env_1, __ts2gml_env_3: __ts2gml_env_3, __ts2gml_env_4: __ts2gml_env_4, __ts2gml_env_5: __ts2gml_env_5, __ts2gml_closure: true }, function (__ts2gml_capture_5_parameter) {
                    var __ts2gml_env_1 = self.__ts2gml_env_1;
                    var __ts2gml_env_3 = self.__ts2gml_env_3;
                    var __ts2gml_env_4 = self.__ts2gml_env_4;
                    var __ts2gml_env_5 = self.__ts2gml_env_5;
                    var __ts2gml_env_6 = { __ts2gml_capture_5: __ts2gml_capture_5_parameter };
                    return method({ __ts2gml_env_1: __ts2gml_env_1, __ts2gml_env_3: __ts2gml_env_3, __ts2gml_env_4: __ts2gml_env_4, __ts2gml_env_5: __ts2gml_env_5, __ts2gml_env_6: __ts2gml_env_6, __ts2gml_closure: true }, function (__ts2gml_capture_6_parameter) {
                        var __ts2gml_env_1 = self.__ts2gml_env_1;
                        var __ts2gml_env_3 = self.__ts2gml_env_3;
                        var __ts2gml_env_4 = self.__ts2gml_env_4;
                        var __ts2gml_env_5 = self.__ts2gml_env_5;
                        var __ts2gml_env_6 = self.__ts2gml_env_6;
                        var __ts2gml_env_7 = { __ts2gml_capture_6: __ts2gml_capture_6_parameter };
                        return method({ __ts2gml_env_1: __ts2gml_env_1, __ts2gml_env_3: __ts2gml_env_3, __ts2gml_env_4: __ts2gml_env_4, __ts2gml_env_5: __ts2gml_env_5, __ts2gml_env_6: __ts2gml_env_6, __ts2gml_env_7: __ts2gml_env_7, __ts2gml_closure: true }, function (__ts2gml_capture_7_parameter) {
                            var __ts2gml_env_1 = self.__ts2gml_env_1;
                            var __ts2gml_env_3 = self.__ts2gml_env_3;
                            var __ts2gml_env_4 = self.__ts2gml_env_4;
                            var __ts2gml_env_5 = self.__ts2gml_env_5;
                            var __ts2gml_env_6 = self.__ts2gml_env_6;
                            var __ts2gml_env_7 = self.__ts2gml_env_7;
                            var __ts2gml_env_8 = { __ts2gml_capture_7: __ts2gml_capture_7_parameter };
                            return method({ __ts2gml_env_1: __ts2gml_env_1, __ts2gml_env_3: __ts2gml_env_3, __ts2gml_env_4: __ts2gml_env_4, __ts2gml_env_5: __ts2gml_env_5, __ts2gml_env_6: __ts2gml_env_6, __ts2gml_env_7: __ts2gml_env_7, __ts2gml_env_8: __ts2gml_env_8, __ts2gml_closure: true }, function (__ts2gml_capture_8_parameter) {
                                var __ts2gml_env_1 = self.__ts2gml_env_1;
                                var __ts2gml_env_3 = self.__ts2gml_env_3;
                                var __ts2gml_env_4 = self.__ts2gml_env_4;
                                var __ts2gml_env_5 = self.__ts2gml_env_5;
                                var __ts2gml_env_6 = self.__ts2gml_env_6;
                                var __ts2gml_env_7 = self.__ts2gml_env_7;
                                var __ts2gml_env_8 = self.__ts2gml_env_8;
                                var __ts2gml_env_9 = { __ts2gml_capture_8: __ts2gml_capture_8_parameter };
                                return method({ __ts2gml_env_1: __ts2gml_env_1, __ts2gml_env_3: __ts2gml_env_3, __ts2gml_env_4: __ts2gml_env_4, __ts2gml_env_5: __ts2gml_env_5, __ts2gml_env_6: __ts2gml_env_6, __ts2gml_env_7: __ts2gml_env_7, __ts2gml_env_8: __ts2gml_env_8, __ts2gml_env_9: __ts2gml_env_9, __ts2gml_closure: true }, function (__ts2gml_capture_9_parameter) {
                                    var __ts2gml_env_1 = self.__ts2gml_env_1;
                                    var __ts2gml_env_3 = self.__ts2gml_env_3;
                                    var __ts2gml_env_4 = self.__ts2gml_env_4;
                                    var __ts2gml_env_5 = self.__ts2gml_env_5;
                                    var __ts2gml_env_6 = self.__ts2gml_env_6;
                                    var __ts2gml_env_7 = self.__ts2gml_env_7;
                                    var __ts2gml_env_8 = self.__ts2gml_env_8;
                                    var __ts2gml_env_9 = self.__ts2gml_env_9;
                                    var __ts2gml_env_10 = { __ts2gml_capture_9: __ts2gml_capture_9_parameter };
                                    return method({ __ts2gml_env_1: __ts2gml_env_1, __ts2gml_env_3: __ts2gml_env_3, __ts2gml_env_4: __ts2gml_env_4, __ts2gml_env_5: __ts2gml_env_5, __ts2gml_env_6: __ts2gml_env_6, __ts2gml_env_7: __ts2gml_env_7, __ts2gml_env_8: __ts2gml_env_8, __ts2gml_env_9: __ts2gml_env_9, __ts2gml_env_10: __ts2gml_env_10, __ts2gml_closure: true }, function (__ts2gml_capture_10_parameter) {
                                        var __ts2gml_env_1 = self.__ts2gml_env_1;
                                        var __ts2gml_env_3 = self.__ts2gml_env_3;
                                        var __ts2gml_env_4 = self.__ts2gml_env_4;
                                        var __ts2gml_env_5 = self.__ts2gml_env_5;
                                        var __ts2gml_env_6 = self.__ts2gml_env_6;
                                        var __ts2gml_env_7 = self.__ts2gml_env_7;
                                        var __ts2gml_env_8 = self.__ts2gml_env_8;
                                        var __ts2gml_env_9 = self.__ts2gml_env_9;
                                        var __ts2gml_env_10 = self.__ts2gml_env_10;
                                        var __ts2gml_env_11 = { __ts2gml_capture_10: __ts2gml_capture_10_parameter };
                                        return method({ __ts2gml_env_1: __ts2gml_env_1, __ts2gml_env_3: __ts2gml_env_3, __ts2gml_env_4: __ts2gml_env_4, __ts2gml_env_5: __ts2gml_env_5, __ts2gml_env_6: __ts2gml_env_6, __ts2gml_env_7: __ts2gml_env_7, __ts2gml_env_8: __ts2gml_env_8, __ts2gml_env_9: __ts2gml_env_9, __ts2gml_env_10: __ts2gml_env_10, __ts2gml_env_11: __ts2gml_env_11, __ts2gml_closure: true }, function (__ts2gml_capture_11_parameter) {
                                            var __ts2gml_env_1 = self.__ts2gml_env_1;
                                            var __ts2gml_env_3 = self.__ts2gml_env_3;
                                            var __ts2gml_env_4 = self.__ts2gml_env_4;
                                            var __ts2gml_env_5 = self.__ts2gml_env_5;
                                            var __ts2gml_env_6 = self.__ts2gml_env_6;
                                            var __ts2gml_env_7 = self.__ts2gml_env_7;
                                            var __ts2gml_env_8 = self.__ts2gml_env_8;
                                            var __ts2gml_env_9 = self.__ts2gml_env_9;
                                            var __ts2gml_env_10 = self.__ts2gml_env_10;
                                            var __ts2gml_env_11 = self.__ts2gml_env_11;
                                            var __ts2gml_env_12 = { __ts2gml_capture_11: __ts2gml_capture_11_parameter };
                                            return method({ __ts2gml_env_1: __ts2gml_env_1, __ts2gml_env_3: __ts2gml_env_3, __ts2gml_env_4: __ts2gml_env_4, __ts2gml_env_5: __ts2gml_env_5, __ts2gml_env_6: __ts2gml_env_6, __ts2gml_env_7: __ts2gml_env_7, __ts2gml_env_8: __ts2gml_env_8, __ts2gml_env_9: __ts2gml_env_9, __ts2gml_env_10: __ts2gml_env_10, __ts2gml_env_11: __ts2gml_env_11, __ts2gml_env_12: __ts2gml_env_12, __ts2gml_closure: true }, function (__ts2gml_capture_12_parameter) {
                                                var __ts2gml_env_1 = self.__ts2gml_env_1;
                                                var __ts2gml_env_3 = self.__ts2gml_env_3;
                                                var __ts2gml_env_4 = self.__ts2gml_env_4;
                                                var __ts2gml_env_5 = self.__ts2gml_env_5;
                                                var __ts2gml_env_6 = self.__ts2gml_env_6;
                                                var __ts2gml_env_7 = self.__ts2gml_env_7;
                                                var __ts2gml_env_8 = self.__ts2gml_env_8;
                                                var __ts2gml_env_9 = self.__ts2gml_env_9;
                                                var __ts2gml_env_10 = self.__ts2gml_env_10;
                                                var __ts2gml_env_11 = self.__ts2gml_env_11;
                                                var __ts2gml_env_12 = self.__ts2gml_env_12;
                                                var __ts2gml_env_13 = { __ts2gml_capture_12: __ts2gml_capture_12_parameter };
                                                return method({ __ts2gml_env_1: __ts2gml_env_1, __ts2gml_env_3: __ts2gml_env_3, __ts2gml_env_4: __ts2gml_env_4, __ts2gml_env_5: __ts2gml_env_5, __ts2gml_env_6: __ts2gml_env_6, __ts2gml_env_7: __ts2gml_env_7, __ts2gml_env_8: __ts2gml_env_8, __ts2gml_env_9: __ts2gml_env_9, __ts2gml_env_10: __ts2gml_env_10, __ts2gml_env_11: __ts2gml_env_11, __ts2gml_env_12: __ts2gml_env_12, __ts2gml_env_13: __ts2gml_env_13, __ts2gml_closure: true }, function (__ts2gml_capture_13_parameter) {
                                                    var __ts2gml_env_1 = self.__ts2gml_env_1;
                                                    var __ts2gml_env_3 = self.__ts2gml_env_3;
                                                    var __ts2gml_env_4 = self.__ts2gml_env_4;
                                                    var __ts2gml_env_5 = self.__ts2gml_env_5;
                                                    var __ts2gml_env_6 = self.__ts2gml_env_6;
                                                    var __ts2gml_env_7 = self.__ts2gml_env_7;
                                                    var __ts2gml_env_8 = self.__ts2gml_env_8;
                                                    var __ts2gml_env_9 = self.__ts2gml_env_9;
                                                    var __ts2gml_env_10 = self.__ts2gml_env_10;
                                                    var __ts2gml_env_11 = self.__ts2gml_env_11;
                                                    var __ts2gml_env_12 = self.__ts2gml_env_12;
                                                    var __ts2gml_env_13 = self.__ts2gml_env_13;
                                                    var __ts2gml_env_14 = { __ts2gml_capture_13: __ts2gml_capture_13_parameter };
                                                    return method({ __ts2gml_env_1: __ts2gml_env_1, __ts2gml_env_3: __ts2gml_env_3, __ts2gml_env_4: __ts2gml_env_4, __ts2gml_env_5: __ts2gml_env_5, __ts2gml_env_6: __ts2gml_env_6, __ts2gml_env_7: __ts2gml_env_7, __ts2gml_env_8: __ts2gml_env_8, __ts2gml_env_9: __ts2gml_env_9, __ts2gml_env_10: __ts2gml_env_10, __ts2gml_env_11: __ts2gml_env_11, __ts2gml_env_12: __ts2gml_env_12, __ts2gml_env_13: __ts2gml_env_13, __ts2gml_env_14: __ts2gml_env_14, __ts2gml_closure: true }, function (__ts2gml_capture_14_parameter) {
                                                        var __ts2gml_env_1 = self.__ts2gml_env_1;
                                                        var __ts2gml_env_3 = self.__ts2gml_env_3;
                                                        var __ts2gml_env_4 = self.__ts2gml_env_4;
                                                        var __ts2gml_env_5 = self.__ts2gml_env_5;
                                                        var __ts2gml_env_6 = self.__ts2gml_env_6;
                                                        var __ts2gml_env_7 = self.__ts2gml_env_7;
                                                        var __ts2gml_env_8 = self.__ts2gml_env_8;
                                                        var __ts2gml_env_9 = self.__ts2gml_env_9;
                                                        var __ts2gml_env_10 = self.__ts2gml_env_10;
                                                        var __ts2gml_env_11 = self.__ts2gml_env_11;
                                                        var __ts2gml_env_12 = self.__ts2gml_env_12;
                                                        var __ts2gml_env_13 = self.__ts2gml_env_13;
                                                        var __ts2gml_env_14 = self.__ts2gml_env_14;
                                                        var __ts2gml_env_15 = { __ts2gml_capture_14: __ts2gml_capture_14_parameter };
                                                        return method({ __ts2gml_env_1: __ts2gml_env_1, __ts2gml_env_3: __ts2gml_env_3, __ts2gml_env_4: __ts2gml_env_4, __ts2gml_env_5: __ts2gml_env_5, __ts2gml_env_6: __ts2gml_env_6, __ts2gml_env_7: __ts2gml_env_7, __ts2gml_env_8: __ts2gml_env_8, __ts2gml_env_9: __ts2gml_env_9, __ts2gml_env_10: __ts2gml_env_10, __ts2gml_env_11: __ts2gml_env_11, __ts2gml_env_12: __ts2gml_env_12, __ts2gml_env_13: __ts2gml_env_13, __ts2gml_env_14: __ts2gml_env_14, __ts2gml_env_15: __ts2gml_env_15, __ts2gml_closure: true }, function (__ts2gml_capture_15_parameter) {
                                                            var __ts2gml_env_1 = self.__ts2gml_env_1;
                                                            var __ts2gml_env_3 = self.__ts2gml_env_3;
                                                            var __ts2gml_env_4 = self.__ts2gml_env_4;
                                                            var __ts2gml_env_5 = self.__ts2gml_env_5;
                                                            var __ts2gml_env_6 = self.__ts2gml_env_6;
                                                            var __ts2gml_env_7 = self.__ts2gml_env_7;
                                                            var __ts2gml_env_8 = self.__ts2gml_env_8;
                                                            var __ts2gml_env_9 = self.__ts2gml_env_9;
                                                            var __ts2gml_env_10 = self.__ts2gml_env_10;
                                                            var __ts2gml_env_11 = self.__ts2gml_env_11;
                                                            var __ts2gml_env_12 = self.__ts2gml_env_12;
                                                            var __ts2gml_env_13 = self.__ts2gml_env_13;
                                                            var __ts2gml_env_14 = self.__ts2gml_env_14;
                                                            var __ts2gml_env_15 = self.__ts2gml_env_15;
                                                            var __ts2gml_env_16 = { __ts2gml_capture_15: __ts2gml_capture_15_parameter };
                                                            return method({ __ts2gml_env_1: __ts2gml_env_1, __ts2gml_env_3: __ts2gml_env_3, __ts2gml_env_4: __ts2gml_env_4, __ts2gml_env_5: __ts2gml_env_5, __ts2gml_env_6: __ts2gml_env_6, __ts2gml_env_7: __ts2gml_env_7, __ts2gml_env_8: __ts2gml_env_8, __ts2gml_env_9: __ts2gml_env_9, __ts2gml_env_10: __ts2gml_env_10, __ts2gml_env_11: __ts2gml_env_11, __ts2gml_env_12: __ts2gml_env_12, __ts2gml_env_13: __ts2gml_env_13, __ts2gml_env_14: __ts2gml_env_14, __ts2gml_env_15: __ts2gml_env_15, __ts2gml_env_16: __ts2gml_env_16, __ts2gml_closure: true }, function (__ts2gml_capture_16_parameter) {
                                                                var __ts2gml_env_1 = self.__ts2gml_env_1;
                                                                var __ts2gml_env_3 = self.__ts2gml_env_3;
                                                                var __ts2gml_env_4 = self.__ts2gml_env_4;
                                                                var __ts2gml_env_5 = self.__ts2gml_env_5;
                                                                var __ts2gml_env_6 = self.__ts2gml_env_6;
                                                                var __ts2gml_env_7 = self.__ts2gml_env_7;
                                                                var __ts2gml_env_8 = self.__ts2gml_env_8;
                                                                var __ts2gml_env_9 = self.__ts2gml_env_9;
                                                                var __ts2gml_env_10 = self.__ts2gml_env_10;
                                                                var __ts2gml_env_11 = self.__ts2gml_env_11;
                                                                var __ts2gml_env_12 = self.__ts2gml_env_12;
                                                                var __ts2gml_env_13 = self.__ts2gml_env_13;
                                                                var __ts2gml_env_14 = self.__ts2gml_env_14;
                                                                var __ts2gml_env_15 = self.__ts2gml_env_15;
                                                                var __ts2gml_env_16 = self.__ts2gml_env_16;
                                                                var __ts2gml_env_17 = { __ts2gml_capture_16: __ts2gml_capture_16_parameter };
                                                                return method({ __ts2gml_env_1: __ts2gml_env_1, __ts2gml_env_3: __ts2gml_env_3, __ts2gml_env_4: __ts2gml_env_4, __ts2gml_env_5: __ts2gml_env_5, __ts2gml_env_6: __ts2gml_env_6, __ts2gml_env_7: __ts2gml_env_7, __ts2gml_env_8: __ts2gml_env_8, __ts2gml_env_9: __ts2gml_env_9, __ts2gml_env_10: __ts2gml_env_10, __ts2gml_env_11: __ts2gml_env_11, __ts2gml_env_12: __ts2gml_env_12, __ts2gml_env_13: __ts2gml_env_13, __ts2gml_env_14: __ts2gml_env_14, __ts2gml_env_15: __ts2gml_env_15, __ts2gml_env_16: __ts2gml_env_16, __ts2gml_env_17: __ts2gml_env_17, __ts2gml_closure: true }, function (__ts2gml_capture_17_parameter) {
                                                                    var __ts2gml_env_1 = self.__ts2gml_env_1;
                                                                    var __ts2gml_env_3 = self.__ts2gml_env_3;
                                                                    var __ts2gml_env_4 = self.__ts2gml_env_4;
                                                                    var __ts2gml_env_5 = self.__ts2gml_env_5;
                                                                    var __ts2gml_env_6 = self.__ts2gml_env_6;
                                                                    var __ts2gml_env_7 = self.__ts2gml_env_7;
                                                                    var __ts2gml_env_8 = self.__ts2gml_env_8;
                                                                    var __ts2gml_env_9 = self.__ts2gml_env_9;
                                                                    var __ts2gml_env_10 = self.__ts2gml_env_10;
                                                                    var __ts2gml_env_11 = self.__ts2gml_env_11;
                                                                    var __ts2gml_env_12 = self.__ts2gml_env_12;
                                                                    var __ts2gml_env_13 = self.__ts2gml_env_13;
                                                                    var __ts2gml_env_14 = self.__ts2gml_env_14;
                                                                    var __ts2gml_env_15 = self.__ts2gml_env_15;
                                                                    var __ts2gml_env_16 = self.__ts2gml_env_16;
                                                                    var __ts2gml_env_17 = self.__ts2gml_env_17;
                                                                    var __ts2gml_env_18 = { __ts2gml_capture_17: __ts2gml_capture_17_parameter };
                                                                    return {
                                                                        read: method({ __ts2gml_env_1: __ts2gml_env_1, __ts2gml_env_3: __ts2gml_env_3, __ts2gml_env_4: __ts2gml_env_4, __ts2gml_env_5: __ts2gml_env_5, __ts2gml_env_6: __ts2gml_env_6, __ts2gml_env_7: __ts2gml_env_7, __ts2gml_env_8: __ts2gml_env_8, __ts2gml_env_9: __ts2gml_env_9, __ts2gml_env_10: __ts2gml_env_10, __ts2gml_env_11: __ts2gml_env_11, __ts2gml_env_12: __ts2gml_env_12, __ts2gml_env_13: __ts2gml_env_13, __ts2gml_env_14: __ts2gml_env_14, __ts2gml_env_15: __ts2gml_env_15, __ts2gml_env_16: __ts2gml_env_16, __ts2gml_env_17: __ts2gml_env_17, __ts2gml_env_18: __ts2gml_env_18, __ts2gml_closure: true }, function () {
                                                                            var __ts2gml_env_1 = self.__ts2gml_env_1;
                                                                            var __ts2gml_env_3 = self.__ts2gml_env_3;
                                                                            var __ts2gml_env_4 = self.__ts2gml_env_4;
                                                                            var __ts2gml_env_5 = self.__ts2gml_env_5;
                                                                            var __ts2gml_env_6 = self.__ts2gml_env_6;
                                                                            var __ts2gml_env_7 = self.__ts2gml_env_7;
                                                                            var __ts2gml_env_8 = self.__ts2gml_env_8;
                                                                            var __ts2gml_env_9 = self.__ts2gml_env_9;
                                                                            var __ts2gml_env_10 = self.__ts2gml_env_10;
                                                                            var __ts2gml_env_11 = self.__ts2gml_env_11;
                                                                            var __ts2gml_env_12 = self.__ts2gml_env_12;
                                                                            var __ts2gml_env_13 = self.__ts2gml_env_13;
                                                                            var __ts2gml_env_14 = self.__ts2gml_env_14;
                                                                            var __ts2gml_env_15 = self.__ts2gml_env_15;
                                                                            var __ts2gml_env_16 = self.__ts2gml_env_16;
                                                                            var __ts2gml_env_17 = self.__ts2gml_env_17;
                                                                            var __ts2gml_env_18 = self.__ts2gml_env_18;
                                                                            return __ts2gml_env_1.__ts2gml_capture_1 + __ts2gml_env_3.__ts2gml_capture_2 + __ts2gml_env_4.__ts2gml_capture_3 + __ts2gml_env_5.__ts2gml_capture_4 + __ts2gml_env_6.__ts2gml_capture_5 + __ts2gml_env_7.__ts2gml_capture_6 + __ts2gml_env_8.__ts2gml_capture_7 + __ts2gml_env_9.__ts2gml_capture_8 + __ts2gml_env_10.__ts2gml_capture_9 + __ts2gml_env_11.__ts2gml_capture_10 + __ts2gml_env_12.__ts2gml_capture_11 + __ts2gml_env_13.__ts2gml_capture_12 + __ts2gml_env_14.__ts2gml_capture_13 + __ts2gml_env_15.__ts2gml_capture_14 + __ts2gml_env_16.__ts2gml_capture_15 + __ts2gml_env_17.__ts2gml_capture_16 + __ts2gml_env_18.__ts2gml_capture_17;
                                                                        }),
                                                                        bump: method({ __ts2gml_env_1: __ts2gml_env_1, __ts2gml_env_3: __ts2gml_env_3, __ts2gml_env_10: __ts2gml_env_10, __ts2gml_env_18: __ts2gml_env_18, __ts2gml_env_4: __ts2gml_env_4, __ts2gml_env_5: __ts2gml_env_5, __ts2gml_env_6: __ts2gml_env_6, __ts2gml_env_7: __ts2gml_env_7, __ts2gml_env_8: __ts2gml_env_8, __ts2gml_env_9: __ts2gml_env_9, __ts2gml_env_11: __ts2gml_env_11, __ts2gml_env_12: __ts2gml_env_12, __ts2gml_env_13: __ts2gml_env_13, __ts2gml_env_14: __ts2gml_env_14, __ts2gml_env_15: __ts2gml_env_15, __ts2gml_env_16: __ts2gml_env_16, __ts2gml_env_17: __ts2gml_env_17, __ts2gml_closure: true }, function (amount) {
                                                                            var __ts2gml_env_1 = self.__ts2gml_env_1;
                                                                            var __ts2gml_env_3 = self.__ts2gml_env_3;
                                                                            var __ts2gml_env_10 = self.__ts2gml_env_10;
                                                                            var __ts2gml_env_18 = self.__ts2gml_env_18;
                                                                            var __ts2gml_env_4 = self.__ts2gml_env_4;
                                                                            var __ts2gml_env_5 = self.__ts2gml_env_5;
                                                                            var __ts2gml_env_6 = self.__ts2gml_env_6;
                                                                            var __ts2gml_env_7 = self.__ts2gml_env_7;
                                                                            var __ts2gml_env_8 = self.__ts2gml_env_8;
                                                                            var __ts2gml_env_9 = self.__ts2gml_env_9;
                                                                            var __ts2gml_env_11 = self.__ts2gml_env_11;
                                                                            var __ts2gml_env_12 = self.__ts2gml_env_12;
                                                                            var __ts2gml_env_13 = self.__ts2gml_env_13;
                                                                            var __ts2gml_env_14 = self.__ts2gml_env_14;
                                                                            var __ts2gml_env_15 = self.__ts2gml_env_15;
                                                                            var __ts2gml_env_16 = self.__ts2gml_env_16;
                                                                            var __ts2gml_env_17 = self.__ts2gml_env_17;
                                                                            __ts2gml_env_1.__ts2gml_capture_1 += amount;
                                                                            __ts2gml_env_3.__ts2gml_capture_2 += amount;
                                                                            __ts2gml_env_10.__ts2gml_capture_9 += amount;
                                                                            __ts2gml_env_18.__ts2gml_capture_17 += amount;
                                                                            return __ts2gml_env_1.__ts2gml_capture_1 + __ts2gml_env_3.__ts2gml_capture_2 + __ts2gml_env_4.__ts2gml_capture_3 + __ts2gml_env_5.__ts2gml_capture_4 + __ts2gml_env_6.__ts2gml_capture_5 + __ts2gml_env_7.__ts2gml_capture_6 + __ts2gml_env_8.__ts2gml_capture_7 + __ts2gml_env_9.__ts2gml_capture_8 + __ts2gml_env_10.__ts2gml_capture_9 + __ts2gml_env_11.__ts2gml_capture_10 + __ts2gml_env_12.__ts2gml_capture_11 + __ts2gml_env_13.__ts2gml_capture_12 + __ts2gml_env_14.__ts2gml_capture_13 + __ts2gml_env_15.__ts2gml_capture_14 + __ts2gml_env_16.__ts2gml_capture_15 + __ts2gml_env_17.__ts2gml_capture_16 + __ts2gml_env_18.__ts2gml_capture_17;
                                                                        })
                                                                    };
                                                                });
                                                            });
                                                        });
                                                    });
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
    return { readSeed: readSeed, branch: branch };
}

function ClosureContractBase(__ts2gml_capture_19_parameter) constructor {
    self.value = 10;
    self.readConstructor = function () { return 0; };
    self.fieldFactory = method(self, function (__ts2gml_capture_18_parameter) {
        var __ts2gml_env_22_self = method_get_self(function () { });
        var __ts2gml_env_22_lexical = self;
        var __ts2gml_env_22 = { __ts2gml_capture_18: __ts2gml_capture_18_parameter };
        return method({ __ts2gml_env_22: __ts2gml_env_22, __ts2gml_receiver: __ts2gml_env_22_self, __ts2gml_this: __ts2gml_env_22_lexical, __ts2gml_closure: true }, function () {
            var __ts2gml_env_22 = self.__ts2gml_env_22;
            var __ts2gml_env_23_this = self.__ts2gml_this;
            with (__ts2gml_value_truthy(is_undefined(self.__ts2gml_receiver)) ? other : self.__ts2gml_receiver) {
                return __ts2gml_env_23_this.value + __ts2gml_env_22.__ts2gml_capture_18;
            }
        });
    });
    static factory = function(__ts2gml_capture_20_parameter) {
        var __ts2gml_env_26_self = method_get_self(function () { });
        var __ts2gml_env_26_lexical = self;
        var __ts2gml_env_26 = { __ts2gml_capture_20: __ts2gml_capture_20_parameter };
        return {
            read: method({ __ts2gml_env_26: __ts2gml_env_26, __ts2gml_receiver: __ts2gml_env_26_self, __ts2gml_this: __ts2gml_env_26_lexical, __ts2gml_closure: true }, function () {
                var __ts2gml_env_26 = self.__ts2gml_env_26;
                var __ts2gml_env_27_this = self.__ts2gml_this;
                with (__ts2gml_value_truthy(is_undefined(self.__ts2gml_receiver)) ? other : self.__ts2gml_receiver) {
                    return __ts2gml_env_27_this.value + __ts2gml_env_26.__ts2gml_capture_20;
                }
            }),
            nested: method({ __ts2gml_env_26: __ts2gml_env_26, __ts2gml_receiver: __ts2gml_env_26_self, __ts2gml_this: __ts2gml_env_26_lexical, __ts2gml_closure: true }, function () {
                var __ts2gml_env_26 = self.__ts2gml_env_26;
                var __ts2gml_env_28_this = self.__ts2gml_this;
                with (__ts2gml_value_truthy(is_undefined(self.__ts2gml_receiver)) ? other : self.__ts2gml_receiver) {
                    var __ts2gml_env_28_self = method_get_self(function () { });
                    return method({ __ts2gml_env_26: __ts2gml_env_26, __ts2gml_receiver: __ts2gml_env_28_self, __ts2gml_this: __ts2gml_env_28_this, __ts2gml_closure: true }, function (__ts2gml_capture_21_parameter) {
                        var __ts2gml_env_26 = self.__ts2gml_env_26;
                        var __ts2gml_env_29_this = self.__ts2gml_this;
                        with (__ts2gml_value_truthy(is_undefined(self.__ts2gml_receiver)) ? other : self.__ts2gml_receiver) {
                            var __ts2gml_env_29_self = method_get_self(function () { });
                            var __ts2gml_env_29 = { __ts2gml_capture_21: __ts2gml_capture_21_parameter };
                            return method({ __ts2gml_env_26: __ts2gml_env_26, __ts2gml_env_29: __ts2gml_env_29, __ts2gml_receiver: __ts2gml_env_29_self, __ts2gml_this: __ts2gml_env_29_this, __ts2gml_closure: true }, function () {
                                var __ts2gml_env_26 = self.__ts2gml_env_26;
                                var __ts2gml_env_29 = self.__ts2gml_env_29;
                                var __ts2gml_env_30_this = self.__ts2gml_this;
                                with (__ts2gml_value_truthy(is_undefined(self.__ts2gml_receiver)) ? other : self.__ts2gml_receiver) {
                                    return __ts2gml_env_30_this.value + __ts2gml_env_26.__ts2gml_capture_20 + __ts2gml_env_29.__ts2gml_capture_21;
                                }
                            });
                        }
                    });
                }
            }),
            array: [method({ __ts2gml_env_26: __ts2gml_env_26, __ts2gml_receiver: __ts2gml_env_26_self, __ts2gml_this: __ts2gml_env_26_lexical, __ts2gml_closure: true }, function () {
                    var __ts2gml_env_26 = self.__ts2gml_env_26;
                    var __ts2gml_env_31_this = self.__ts2gml_this;
                    with (__ts2gml_value_truthy(is_undefined(self.__ts2gml_receiver)) ? other : self.__ts2gml_receiver) {
                        return __ts2gml_env_31_this.value + __ts2gml_env_26.__ts2gml_capture_20;
                    }
                })],
        };
    };
    static literalFactories = function() {
        return {
            value: 999,
            factory: method(self, function (__ts2gml_capture_22_parameter) {
                var __ts2gml_env_33_self = method_get_self(function () { });
                var __ts2gml_env_33_lexical = self;
                var __ts2gml_env_33 = { __ts2gml_capture_22: __ts2gml_capture_22_parameter };
                return method({ __ts2gml_env_33: __ts2gml_env_33, __ts2gml_receiver: __ts2gml_env_33_self, __ts2gml_this: __ts2gml_env_33_lexical, __ts2gml_closure: true }, function () {
                    var __ts2gml_env_33 = self.__ts2gml_env_33;
                    var __ts2gml_env_34_this = self.__ts2gml_this;
                    with (__ts2gml_value_truthy(is_undefined(self.__ts2gml_receiver)) ? other : self.__ts2gml_receiver) {
                        return __ts2gml_env_34_this.value + __ts2gml_env_33.__ts2gml_capture_22;
                    }
                });
            }),
            array: [method(self, function (__ts2gml_capture_23_parameter) {
                    var __ts2gml_env_35_self = method_get_self(function () { });
                    var __ts2gml_env_35_lexical = self;
                    var __ts2gml_env_35 = { __ts2gml_capture_23: __ts2gml_capture_23_parameter };
                    return method({ __ts2gml_env_35: __ts2gml_env_35, __ts2gml_receiver: __ts2gml_env_35_self, __ts2gml_this: __ts2gml_env_35_lexical, __ts2gml_closure: true }, function () {
                        var __ts2gml_env_35 = self.__ts2gml_env_35;
                        var __ts2gml_env_36_this = self.__ts2gml_this;
                        with (__ts2gml_value_truthy(is_undefined(self.__ts2gml_receiver)) ? other : self.__ts2gml_receiver) {
                            return __ts2gml_env_36_this.value + __ts2gml_env_35.__ts2gml_capture_23;
                        }
                    });
                })],
        };
    };
    static contextNames = function(__ts2gml_capture_24_parameter, __ts2gml_capture_25_parameter) {
        var __ts2gml_env_37_self = method_get_self(function () { });
        var __ts2gml_env_37_lexical = self;
        var __ts2gml_env_37 = { __ts2gml_capture_24: __ts2gml_capture_24_parameter, __ts2gml_capture_25: __ts2gml_capture_25_parameter };
        return method({ __ts2gml_env_37: __ts2gml_env_37, __ts2gml_receiver: __ts2gml_env_37_self, __ts2gml_this: __ts2gml_env_37_lexical, __ts2gml_closure: true }, function () {
            var __ts2gml_env_37 = self.__ts2gml_env_37;
            var __ts2gml_env_38_this = self.__ts2gml_this;
            with (__ts2gml_value_truthy(is_undefined(self.__ts2gml_receiver)) ? other : self.__ts2gml_receiver) {
                return __ts2gml_env_38_this.value + __ts2gml_env_37.__ts2gml_capture_24 + __ts2gml_env_37.__ts2gml_capture_25;
            }
        });
    };
    {
        var __ts2gml_env_24_self = method_get_self(function () { });
        var __ts2gml_env_24_lexical = self;
        var __ts2gml_env_24 = { __ts2gml_capture_19: __ts2gml_capture_19_parameter };
        self.value = __ts2gml_env_24.__ts2gml_capture_19;
    }
    self.readConstructor = method({ __ts2gml_env_24: __ts2gml_env_24, __ts2gml_receiver: __ts2gml_env_24_self, __ts2gml_this: __ts2gml_env_24_lexical, __ts2gml_closure: true }, function () {
        var __ts2gml_env_24 = self.__ts2gml_env_24;
        var __ts2gml_env_25_this = self.__ts2gml_this;
        with (__ts2gml_value_truthy(is_undefined(self.__ts2gml_receiver)) ? other : self.__ts2gml_receiver) {
            return __ts2gml_env_24.__ts2gml_capture_19 + __ts2gml_env_25_this.value;
        }
    });
    __ts2gml_env_24.__ts2gml_capture_19 += 1;
}

method(__ts2gml_class_statics(ClosureContractBase, true), function() {
    self.factory = method(undefined, function(__ts2gml_capture_26_parameter) {
        var __ts2gml_env_39_self = method_get_self(function () { });
        var __ts2gml_env_39_lexical = self.__ts2gml_class;
        var __ts2gml_env_39 = { __ts2gml_capture_26: __ts2gml_capture_26_parameter };
        return method({ __ts2gml_env_39: __ts2gml_env_39, __ts2gml_receiver: __ts2gml_env_39_self, __ts2gml_this: __ts2gml_env_39_lexical, __ts2gml_closure: true }, function () {
            var __ts2gml_env_39 = self.__ts2gml_env_39;
            var __ts2gml_env_40_this = self.__ts2gml_this;
            with (__ts2gml_value_truthy(is_undefined(self.__ts2gml_receiver)) ? other : self.__ts2gml_receiver) {
                var __ts2gml_env_40_self = method_get_self(function () { });
                return method({ __ts2gml_env_39: __ts2gml_env_39, __ts2gml_receiver: __ts2gml_env_40_self, __ts2gml_this: __ts2gml_env_40_this, __ts2gml_closure: true }, function (__ts2gml_capture_27_parameter) {
                    var __ts2gml_env_39 = self.__ts2gml_env_39;
                    var __ts2gml_env_41_this = self.__ts2gml_this;
                    with (__ts2gml_value_truthy(is_undefined(self.__ts2gml_receiver)) ? other : self.__ts2gml_receiver) {
                        var __ts2gml_env_41_self = method_get_self(function () { });
                        var __ts2gml_env_41 = { __ts2gml_capture_27: __ts2gml_capture_27_parameter };
                        return method({ __ts2gml_env_39: __ts2gml_env_39, __ts2gml_env_41: __ts2gml_env_41, __ts2gml_receiver: __ts2gml_env_41_self, __ts2gml_this: __ts2gml_env_41_this, __ts2gml_closure: true }, function () {
                            var __ts2gml_env_39 = self.__ts2gml_env_39;
                            var __ts2gml_env_41 = self.__ts2gml_env_41;
                            var __ts2gml_env_42_this = self.__ts2gml_this;
                            with (__ts2gml_value_truthy(is_undefined(self.__ts2gml_receiver)) ? other : self.__ts2gml_receiver) {
                                return __ts2gml_class_statics(__ts2gml_env_42_this).value + __ts2gml_env_39.__ts2gml_capture_26 + __ts2gml_env_41.__ts2gml_capture_27;
                            }
                        });
                    }
                });
            }
        });
    });
    self.value = undefined;
    self.value = 100;
})();

function ClosureContractChild(__ts2gml_capture_28_parameter) : ClosureContractBase(__ts2gml_capture_28_parameter) constructor {
    self.readChild = function () { return 0; };
    {
        var __ts2gml_env_44_self = method_get_self(function () { });
        var __ts2gml_env_44_lexical = self;
        var __ts2gml_env_44 = { __ts2gml_capture_28: __ts2gml_capture_28_parameter, __ts2gml_capture_29: undefined };
        __ts2gml_env_44.__ts2gml_capture_29 = 3;
    }
    self.readChild = method({ __ts2gml_env_44: __ts2gml_env_44, __ts2gml_receiver: __ts2gml_env_44_self, __ts2gml_this: __ts2gml_env_44_lexical, __ts2gml_closure: true }, function () {
        var __ts2gml_env_44 = self.__ts2gml_env_44;
        var __ts2gml_env_45_this = self.__ts2gml_this;
        with (__ts2gml_value_truthy(is_undefined(self.__ts2gml_receiver)) ? other : self.__ts2gml_receiver) {
            return __ts2gml_env_44.__ts2gml_capture_28 + __ts2gml_env_44.__ts2gml_capture_29 + __ts2gml_env_45_this.value;
        }
    });
    __ts2gml_env_44.__ts2gml_capture_28 += 2;
}

method(__ts2gml_class_statics(ClosureContractChild, true), function() {
    static_set(self, __ts2gml_class_statics(ClosureContractBase));
    self.value = undefined;
    self.value = 200;
})();

function closureContractDefaults(__ts2gml_capture_30_parameter = 3, __ts2gml_capture_31_parameter = __ts2gml_capture_30_parameter + 1) {
    var __ts2gml_env_46 = { __ts2gml_capture_30: __ts2gml_capture_30_parameter, __ts2gml_capture_31: __ts2gml_capture_31_parameter };
    return method({ __ts2gml_env_46: __ts2gml_env_46, __ts2gml_closure: true }, function (amount = 2) {
        var __ts2gml_env_46 = self.__ts2gml_env_46;
        __ts2gml_env_46.__ts2gml_capture_30 += amount;
        return __ts2gml_env_46.__ts2gml_capture_30 + __ts2gml_env_46.__ts2gml_capture_31;
    });
}

function closureContractShadow(__ts2gml_capture_32_parameter) {
    var __ts2gml_env_48 = { __ts2gml_capture_32: __ts2gml_capture_32_parameter };
    var outer = method({ __ts2gml_env_48: __ts2gml_env_48, __ts2gml_closure: true }, function () {
        var __ts2gml_env_48 = self.__ts2gml_env_48;
        return __ts2gml_env_48.__ts2gml_capture_32;
    });
    var middle = function (__ts2gml_capture_34_parameter) {
        var __ts2gml_env_50 = { __ts2gml_capture_34: __ts2gml_capture_34_parameter };
        var inner = function (__ts2gml_capture_33_parameter) {
            var __ts2gml_env_51 = { __ts2gml_capture_33: __ts2gml_capture_33_parameter };
            return method({ __ts2gml_env_51: __ts2gml_env_51, __ts2gml_closure: true }, function () {
                var __ts2gml_env_51 = self.__ts2gml_env_51;
                return __ts2gml_env_51.__ts2gml_capture_33;
            });
        };
        var read = method({ __ts2gml_env_50: __ts2gml_env_50, __ts2gml_closure: true }, function () {
            var __ts2gml_env_50 = self.__ts2gml_env_50;
            return __ts2gml_env_50.__ts2gml_capture_34;
        });
        __ts2gml_env_50.__ts2gml_capture_34 += 1;
        return { read: read, inner: inner };
    };
    return { outer: outer, middle: middle };
}

function closureContractRun() {
    var __ts2gml_env_54 = { __ts2gml_capture_35: undefined, __ts2gml_capture_36: undefined, __ts2gml_capture_37: undefined, __ts2gml_capture_38: undefined, __ts2gml_capture_39: undefined, __ts2gml_capture_40: undefined, __ts2gml_capture_41: undefined, __ts2gml_capture_42: undefined, __ts2gml_capture_43: undefined, __ts2gml_capture_44: undefined, __ts2gml_capture_45: undefined, __ts2gml_capture_46: undefined, __ts2gml_capture_47: undefined, __ts2gml_capture_48: undefined, __ts2gml_capture_50: undefined, __ts2gml_capture_51: undefined, __ts2gml_capture_52: undefined, __ts2gml_capture_53: undefined };
    show_debug_message("TS2GML_CLOSURE_DEEP_BEGIN");
    var root = closureContractDeep(100);
    var middle = (function (__ts2gml_unused, root) {
        var __ts2gml_callable = (function (__ts2gml_unused, root) {
            var __ts2gml_callable = (function (__ts2gml_unused, root) {
                var __ts2gml_callable = (function (__ts2gml_unused, root) {
                    var __ts2gml_callable = (function (__ts2gml_unused, root) {
                        var __ts2gml_callable = (function (__ts2gml_unused, root) {
                            var __ts2gml_callable = (function (__ts2gml_unused, root) {
                                var __ts2gml_callable = root.branch(1);
                                var __ts2gml_arguments = [2];
                                return is_method(__ts2gml_callable) ? method_call(__ts2gml_callable, __ts2gml_arguments) : script_execute_ext(__ts2gml_callable, __ts2gml_arguments);
                            })(undefined, root);
                            var __ts2gml_arguments = [3];
                            return is_method(__ts2gml_callable) ? method_call(__ts2gml_callable, __ts2gml_arguments) : script_execute_ext(__ts2gml_callable, __ts2gml_arguments);
                        })(undefined, root);
                        var __ts2gml_arguments = [4];
                        return is_method(__ts2gml_callable) ? method_call(__ts2gml_callable, __ts2gml_arguments) : script_execute_ext(__ts2gml_callable, __ts2gml_arguments);
                    })(undefined, root);
                    var __ts2gml_arguments = [5];
                    return is_method(__ts2gml_callable) ? method_call(__ts2gml_callable, __ts2gml_arguments) : script_execute_ext(__ts2gml_callable, __ts2gml_arguments);
                })(undefined, root);
                var __ts2gml_arguments = [6];
                return is_method(__ts2gml_callable) ? method_call(__ts2gml_callable, __ts2gml_arguments) : script_execute_ext(__ts2gml_callable, __ts2gml_arguments);
            })(undefined, root);
            var __ts2gml_arguments = [7];
            return is_method(__ts2gml_callable) ? method_call(__ts2gml_callable, __ts2gml_arguments) : script_execute_ext(__ts2gml_callable, __ts2gml_arguments);
        })(undefined, root);
        var __ts2gml_arguments = [8];
        return is_method(__ts2gml_callable) ? method_call(__ts2gml_callable, __ts2gml_arguments) : script_execute_ext(__ts2gml_callable, __ts2gml_arguments);
    })(undefined, root);
    show_debug_message("TS2GML_CLOSURE_DEEP_MIDDLE");
    var first = (function (__ts2gml_unused, middle) {
        var __ts2gml_callable = (function (__ts2gml_unused, middle) {
            var __ts2gml_callable = (function (__ts2gml_unused, middle) {
                var __ts2gml_callable = (function (__ts2gml_unused, middle) {
                    var __ts2gml_callable = (function (__ts2gml_unused, middle) {
                        var __ts2gml_callable = (function (__ts2gml_unused, middle) {
                            var __ts2gml_callable = (function (__ts2gml_unused, middle) {
                                var __ts2gml_callable = middle(9);
                                var __ts2gml_arguments = [10];
                                return is_method(__ts2gml_callable) ? method_call(__ts2gml_callable, __ts2gml_arguments) : script_execute_ext(__ts2gml_callable, __ts2gml_arguments);
                            })(undefined, middle);
                            var __ts2gml_arguments = [11];
                            return is_method(__ts2gml_callable) ? method_call(__ts2gml_callable, __ts2gml_arguments) : script_execute_ext(__ts2gml_callable, __ts2gml_arguments);
                        })(undefined, middle);
                        var __ts2gml_arguments = [12];
                        return is_method(__ts2gml_callable) ? method_call(__ts2gml_callable, __ts2gml_arguments) : script_execute_ext(__ts2gml_callable, __ts2gml_arguments);
                    })(undefined, middle);
                    var __ts2gml_arguments = [13];
                    return is_method(__ts2gml_callable) ? method_call(__ts2gml_callable, __ts2gml_arguments) : script_execute_ext(__ts2gml_callable, __ts2gml_arguments);
                })(undefined, middle);
                var __ts2gml_arguments = [14];
                return is_method(__ts2gml_callable) ? method_call(__ts2gml_callable, __ts2gml_arguments) : script_execute_ext(__ts2gml_callable, __ts2gml_arguments);
            })(undefined, middle);
            var __ts2gml_arguments = [15];
            return is_method(__ts2gml_callable) ? method_call(__ts2gml_callable, __ts2gml_arguments) : script_execute_ext(__ts2gml_callable, __ts2gml_arguments);
        })(undefined, middle);
        var __ts2gml_arguments = [16];
        return is_method(__ts2gml_callable) ? method_call(__ts2gml_callable, __ts2gml_arguments) : script_execute_ext(__ts2gml_callable, __ts2gml_arguments);
    })(undefined, middle);
    var second = (function (__ts2gml_unused, middle) {
        var __ts2gml_callable = (function (__ts2gml_unused, middle) {
            var __ts2gml_callable = (function (__ts2gml_unused, middle) {
                var __ts2gml_callable = (function (__ts2gml_unused, middle) {
                    var __ts2gml_callable = (function (__ts2gml_unused, middle) {
                        var __ts2gml_callable = (function (__ts2gml_unused, middle) {
                            var __ts2gml_callable = (function (__ts2gml_unused, middle) {
                                var __ts2gml_callable = middle(90);
                                var __ts2gml_arguments = [100];
                                return is_method(__ts2gml_callable) ? method_call(__ts2gml_callable, __ts2gml_arguments) : script_execute_ext(__ts2gml_callable, __ts2gml_arguments);
                            })(undefined, middle);
                            var __ts2gml_arguments = [110];
                            return is_method(__ts2gml_callable) ? method_call(__ts2gml_callable, __ts2gml_arguments) : script_execute_ext(__ts2gml_callable, __ts2gml_arguments);
                        })(undefined, middle);
                        var __ts2gml_arguments = [120];
                        return is_method(__ts2gml_callable) ? method_call(__ts2gml_callable, __ts2gml_arguments) : script_execute_ext(__ts2gml_callable, __ts2gml_arguments);
                    })(undefined, middle);
                    var __ts2gml_arguments = [130];
                    return is_method(__ts2gml_callable) ? method_call(__ts2gml_callable, __ts2gml_arguments) : script_execute_ext(__ts2gml_callable, __ts2gml_arguments);
                })(undefined, middle);
                var __ts2gml_arguments = [140];
                return is_method(__ts2gml_callable) ? method_call(__ts2gml_callable, __ts2gml_arguments) : script_execute_ext(__ts2gml_callable, __ts2gml_arguments);
            })(undefined, middle);
            var __ts2gml_arguments = [150];
            return is_method(__ts2gml_callable) ? method_call(__ts2gml_callable, __ts2gml_arguments) : script_execute_ext(__ts2gml_callable, __ts2gml_arguments);
        })(undefined, middle);
        var __ts2gml_arguments = [160];
        return is_method(__ts2gml_callable) ? method_call(__ts2gml_callable, __ts2gml_arguments) : script_execute_ext(__ts2gml_callable, __ts2gml_arguments);
    })(undefined, middle);
    scopeContextExpect("deep initial sum", first.read(), 236);
    scopeContextExpect("deep sibling initial sum", second.read(), 1136);
    scopeContextExpect("deep write across four environments", first.bump(1), 240);
    scopeContextExpect("deep sibling shares ancestors", second.read(), 1139);
    scopeContextExpect("deep sibling write", second.bump(2), 1147);
    scopeContextExpect("deep leaf storage stays independent", first.read(), 246);
    scopeContextExpect("deep owner sees leaf mutation", root.readSeed(), 103);
    var independent = (function (__ts2gml_unused) {
        var __ts2gml_callable = (function (__ts2gml_unused) {
            var __ts2gml_callable = (function (__ts2gml_unused) {
                var __ts2gml_callable = (function (__ts2gml_unused) {
                    var __ts2gml_callable = (function (__ts2gml_unused) {
                        var __ts2gml_callable = (function (__ts2gml_unused) {
                            var __ts2gml_callable = (function (__ts2gml_unused) {
                                var __ts2gml_callable = (function (__ts2gml_unused) {
                                    var __ts2gml_callable = (function (__ts2gml_unused) {
                                        var __ts2gml_callable = (function (__ts2gml_unused) {
                                            var __ts2gml_callable = (function (__ts2gml_unused) {
                                                var __ts2gml_callable = (function (__ts2gml_unused) {
                                                    var __ts2gml_callable = (function (__ts2gml_unused) {
                                                        var __ts2gml_callable = (function (__ts2gml_unused) {
                                                            var __ts2gml_callable = (function (__ts2gml_unused) {
                                                                var __ts2gml_callable = closureContractDeep(500).branch(1);
                                                                var __ts2gml_arguments = [2];
                                                                return is_method(__ts2gml_callable) ? method_call(__ts2gml_callable, __ts2gml_arguments) : script_execute_ext(__ts2gml_callable, __ts2gml_arguments);
                                                            })(undefined);
                                                            var __ts2gml_arguments = [3];
                                                            return is_method(__ts2gml_callable) ? method_call(__ts2gml_callable, __ts2gml_arguments) : script_execute_ext(__ts2gml_callable, __ts2gml_arguments);
                                                        })(undefined);
                                                        var __ts2gml_arguments = [4];
                                                        return is_method(__ts2gml_callable) ? method_call(__ts2gml_callable, __ts2gml_arguments) : script_execute_ext(__ts2gml_callable, __ts2gml_arguments);
                                                    })(undefined);
                                                    var __ts2gml_arguments = [5];
                                                    return is_method(__ts2gml_callable) ? method_call(__ts2gml_callable, __ts2gml_arguments) : script_execute_ext(__ts2gml_callable, __ts2gml_arguments);
                                                })(undefined);
                                                var __ts2gml_arguments = [6];
                                                return is_method(__ts2gml_callable) ? method_call(__ts2gml_callable, __ts2gml_arguments) : script_execute_ext(__ts2gml_callable, __ts2gml_arguments);
                                            })(undefined);
                                            var __ts2gml_arguments = [7];
                                            return is_method(__ts2gml_callable) ? method_call(__ts2gml_callable, __ts2gml_arguments) : script_execute_ext(__ts2gml_callable, __ts2gml_arguments);
                                        })(undefined);
                                        var __ts2gml_arguments = [8];
                                        return is_method(__ts2gml_callable) ? method_call(__ts2gml_callable, __ts2gml_arguments) : script_execute_ext(__ts2gml_callable, __ts2gml_arguments);
                                    })(undefined);
                                    var __ts2gml_arguments = [9];
                                    return is_method(__ts2gml_callable) ? method_call(__ts2gml_callable, __ts2gml_arguments) : script_execute_ext(__ts2gml_callable, __ts2gml_arguments);
                                })(undefined);
                                var __ts2gml_arguments = [10];
                                return is_method(__ts2gml_callable) ? method_call(__ts2gml_callable, __ts2gml_arguments) : script_execute_ext(__ts2gml_callable, __ts2gml_arguments);
                            })(undefined);
                            var __ts2gml_arguments = [11];
                            return is_method(__ts2gml_callable) ? method_call(__ts2gml_callable, __ts2gml_arguments) : script_execute_ext(__ts2gml_callable, __ts2gml_arguments);
                        })(undefined);
                        var __ts2gml_arguments = [12];
                        return is_method(__ts2gml_callable) ? method_call(__ts2gml_callable, __ts2gml_arguments) : script_execute_ext(__ts2gml_callable, __ts2gml_arguments);
                    })(undefined);
                    var __ts2gml_arguments = [13];
                    return is_method(__ts2gml_callable) ? method_call(__ts2gml_callable, __ts2gml_arguments) : script_execute_ext(__ts2gml_callable, __ts2gml_arguments);
                })(undefined);
                var __ts2gml_arguments = [14];
                return is_method(__ts2gml_callable) ? method_call(__ts2gml_callable, __ts2gml_arguments) : script_execute_ext(__ts2gml_callable, __ts2gml_arguments);
            })(undefined);
            var __ts2gml_arguments = [15];
            return is_method(__ts2gml_callable) ? method_call(__ts2gml_callable, __ts2gml_arguments) : script_execute_ext(__ts2gml_callable, __ts2gml_arguments);
        })(undefined);
        var __ts2gml_arguments = [16];
        return is_method(__ts2gml_callable) ? method_call(__ts2gml_callable, __ts2gml_arguments) : script_execute_ext(__ts2gml_callable, __ts2gml_arguments);
    })(undefined);
    scopeContextExpect("deep independent invocation", independent.read(), 636);
    show_debug_message("TS2GML_CLOSURE_RECEIVERS_BEGIN");
    var owner = new ClosureContractChild(10);
    var foreign = new ClosureContractChild(50);
    scopeContextExpect("base constructor capture", owner.readConstructor(), 21);
    scopeContextExpect("derived constructor capture", owner.readChild(), 25);
    var packet = owner.factory(5);
    var detached = packet.read;
    var __ts2gml_destructure_4647_1 = packet, destructured = variable_struct_get(__ts2gml_destructure_4647_1, "read");
    var forwarded = { value: 1000, read: packet.read };
    var noArguments = [];
    scopeContextExpect("captured arrow in struct", packet.read(), 15);
    scopeContextExpect("captured arrow detached", detached(), 15);
    scopeContextExpect("captured arrow destructured", destructured(), 15);
    scopeContextExpect("captured arrow copied to foreign struct", forwarded.read(), 15);
    scopeContextExpect("captured arrow property spread call", (function (__ts2gml_unused, forwarded, noArguments) {
        var __ts2gml_receiver = forwarded;
        var __ts2gml_method = __ts2gml_receiver.read;
        __ts2gml_method = is_method(__ts2gml_method) && !is_undefined(method_get_self(__ts2gml_method)) ? __ts2gml_method : method(is_array(__ts2gml_receiver) ? undefined : __ts2gml_receiver, __ts2gml_method);
        return method_call(__ts2gml_method, array_concat([], noArguments));
    })(undefined, forwarded, noArguments), 15);
    var readKey = "read";
    scopeContextExpect("captured arrow computed property call", (function (__ts2gml_unused, forwarded, readKey) {
        var __ts2gml_receiver = forwarded;
        var __ts2gml_key = readKey;
        var __ts2gml_method = __ts2gml_value_get(__ts2gml_receiver, __ts2gml_key);
        __ts2gml_method = is_method(__ts2gml_method) && !is_undefined(method_get_self(__ts2gml_method)) ? __ts2gml_method : method(is_array(__ts2gml_receiver) ? undefined : __ts2gml_receiver, __ts2gml_method);
        return method_call(__ts2gml_method, []);
    })(undefined, forwarded, readKey), 15);
    var factoryKey = "factory";
    var dynamicPacket = (function (__ts2gml_unused, owner, factoryKey) {
        var __ts2gml_receiver = owner;
        var __ts2gml_key = factoryKey;
        var __ts2gml_method = __ts2gml_value_get(__ts2gml_receiver, __ts2gml_key);
        __ts2gml_method = is_method(__ts2gml_method) && !is_undefined(method_get_self(__ts2gml_method)) ? __ts2gml_method : method(is_array(__ts2gml_receiver) ? undefined : __ts2gml_receiver, __ts2gml_method);
        return method_call(__ts2gml_method, [2]);
    })(undefined, owner, factoryKey);
    scopeContextExpect("ordinary method computed property receiver", dynamicPacket.read(), 12);
    var ordinarySpread = (function (__ts2gml_unused, owner) {
        var __ts2gml_receiver = owner;
        var __ts2gml_method = __ts2gml_receiver.factory;
        __ts2gml_method = is_method(__ts2gml_method) && !is_undefined(method_get_self(__ts2gml_method)) ? __ts2gml_method : method(is_array(__ts2gml_receiver) ? undefined : __ts2gml_receiver, __ts2gml_method);
        return method_call(__ts2gml_method, array_concat([], [3]));
    })(undefined, owner);
    scopeContextExpect("ordinary method spread receiver", ordinarySpread.read(), 13);
    scopeContextExpect("captured arrow in array", (function (__ts2gml_unused, packet) {
        var __ts2gml_receiver = packet.array;
        var __ts2gml_key = 0;
        var __ts2gml_method = __ts2gml_value_get(__ts2gml_receiver, __ts2gml_key);
        __ts2gml_method = is_method(__ts2gml_method) && !is_undefined(method_get_self(__ts2gml_method)) ? __ts2gml_method : method(is_array(__ts2gml_receiver) ? undefined : __ts2gml_receiver, __ts2gml_method);
        return method_call(__ts2gml_method, []);
    })(undefined, packet), 15);
    var nested = packet.nested();
    var deepRead = nested(3);
    owner.value = 20;
    scopeContextExpect("nested lexical receiver remains live", deepRead(), 28);
    scopeContextExpect("sibling lexical receiver remains live", detached(), 25);
    scopeContextExpect("independent constructor capture", foreign.readConstructor(), 101);
    var field = owner.fieldFactory(2);
    scopeContextExpect("field initializer factory", field(), 22);
    var literal = owner.literalFactories();
    var literalFactory = literal.factory;
    var literalRead = literalFactory(4);
    scopeContextExpect("factory in struct literal retains lexical this", literalRead(), 24);
    var arrayFactory = __ts2gml_value_get(literal.array, 0);
    var arrayRead = arrayFactory(6);
    scopeContextExpect("factory in array literal retains lexical this", arrayRead(), 26);
    var contextNames = owner.contextNames(2, 3);
    scopeContextExpect("captured parameters named self and other", contextNames(), 25);
    var staticRoot = __ts2gml_class_statics(ClosureContractChild).factory(7);
    var staticMiddle = staticRoot();
    var staticRead = staticMiddle(8);
    scopeContextExpect("inherited static factory receiver", staticRead(), 215);
    __ts2gml_class_statics(ClosureContractChild).value = 300;
    scopeContextExpect("static receiver remains live", staticRead(), 315);
    scopeContextExpect("static base remains independent", __ts2gml_class_statics(ClosureContractBase).value, 100);
    show_debug_message("TS2GML_CLOSURE_BINDINGS_BEGIN");
    var defaults = closureContractDefaults();
    scopeContextExpect("captured dependent parameter defaults", defaults(), 9);
    scopeContextExpect("captured parameter default reuses shared binding", defaults(3), 12);
    var shadow = closureContractShadow(10);
    var shadowMiddle = shadow.middle(20);
    var shadowLeaf = shadowMiddle.inner(30);
    scopeContextExpect("shadow outer symbol", shadow.outer(), 10);
    scopeContextExpect("shadow middle symbol", shadowMiddle.read(), 21);
    scopeContextExpect("shadow leaf symbol", shadowLeaf(), 30);
    {
        __ts2gml_env_54.__ts2gml_capture_35 = 1;
        __ts2gml_env_54.__ts2gml_capture_36 = __ts2gml_env_54.__ts2gml_capture_35 + 2;
    }
    var pair = method({ __ts2gml_env_54: __ts2gml_env_54, __ts2gml_closure: true }, function () {
        var __ts2gml_env_54 = self.__ts2gml_env_54;
        return __ts2gml_env_54.__ts2gml_capture_35 + __ts2gml_env_54.__ts2gml_capture_36;
    });
    __ts2gml_env_54.__ts2gml_capture_35 += 1;
    scopeContextExpect("multi-declarator initializer order", pair(), 5);
    __ts2gml_env_54.__ts2gml_capture_37 = undefined;
    var later = method({ __ts2gml_env_54: __ts2gml_env_54, __ts2gml_closure: true }, function () {
        var __ts2gml_env_54 = self.__ts2gml_env_54;
        return __ts2gml_env_54.__ts2gml_capture_37;
    });
    __ts2gml_env_54.__ts2gml_capture_37 = 9;
    scopeContextExpect("uninitialized capture assigned later", later(), 9);
    var early = method({ __ts2gml_env_54: __ts2gml_env_54, __ts2gml_closure: true }, function () {
        var __ts2gml_env_54 = self.__ts2gml_env_54;
        return __ts2gml_env_54.__ts2gml_capture_38;
    });
    __ts2gml_env_54.__ts2gml_capture_38 = 13;
    scopeContextExpect("callback created before binding initialization", early(), 13);
    __ts2gml_env_54.__ts2gml_capture_39 = undefined;
    var readHoisted = method({ __ts2gml_env_54: __ts2gml_env_54, __ts2gml_closure: true }, function () {
        var __ts2gml_env_54 = self.__ts2gml_env_54;
        return __ts2gml_env_54.__ts2gml_capture_39;
    });
    __ts2gml_env_54.__ts2gml_capture_39 = 17;
    scopeContextExpect("captured var initialization", readHoisted(), 17);
    __ts2gml_env_54.__ts2gml_capture_40 = undefined;
    __ts2gml_env_54.__ts2gml_capture_41 = method({ __ts2gml_env_54: __ts2gml_env_54, __ts2gml_closure: true }, function (depth) {
        var __ts2gml_env_54 = self.__ts2gml_env_54;
        return __ts2gml_value_truthy(__ts2gml_value_equal(depth, 0)) ? true : __ts2gml_env_54.__ts2gml_capture_40(depth - 1);
    });
    __ts2gml_env_54.__ts2gml_capture_40 = method({ __ts2gml_env_54: __ts2gml_env_54, __ts2gml_closure: true }, function (depth) {
        var __ts2gml_env_54 = self.__ts2gml_env_54;
        return __ts2gml_value_truthy(__ts2gml_value_equal(depth, 0)) ? false : __ts2gml_env_54.__ts2gml_capture_41(depth - 1);
    });
    scopeContextExpect("mutually recursive captured callbacks", __ts2gml_env_54.__ts2gml_capture_41(12), true);
    scopeContextExpect("mutual recursion other branch", __ts2gml_env_54.__ts2gml_capture_40(11), true);
    __ts2gml_env_54.__ts2gml_capture_42 = 0;
    __ts2gml_env_54.__ts2gml_capture_43 = method({ __ts2gml_env_54: __ts2gml_env_54, __ts2gml_closure: true }, function () {
        var __ts2gml_env_54 = self.__ts2gml_env_54;
        __ts2gml_env_54.__ts2gml_capture_42 += 1;
        return __ts2gml_env_54.__ts2gml_capture_42;
    });
    var lazy = method({ __ts2gml_env_54: __ts2gml_env_54, __ts2gml_closure: true }, function (value) {
        var __ts2gml_env_54 = self.__ts2gml_env_54;
        return (function (__ts2gml_logical_4647_2, __ts2gml_env_54) {
            return __ts2gml_value_truthy(__ts2gml_logical_4647_2) ? __ts2gml_logical_4647_2 : __ts2gml_env_54.__ts2gml_capture_43();
        })(((function (__ts2gml_logical_4647_3, __ts2gml_env_54) {
            return __ts2gml_value_nullish(__ts2gml_logical_4647_3) ? __ts2gml_env_54.__ts2gml_capture_43() : __ts2gml_logical_4647_3;
        })(value, __ts2gml_env_54)), __ts2gml_env_54);
    });
    scopeContextExpect("logical defined branch skips captures", lazy(7), 7);
    scopeContextExpect("logical missing branch invokes capture", lazy(undefined), 1);
    scopeContextExpect("logical zero invokes second branch", lazy(0), 2);
    scopeContextExpect("logical side effects occur once", __ts2gml_env_54.__ts2gml_capture_42, 2);
    __ts2gml_env_54.__ts2gml_capture_45 = [10, 20];
    __ts2gml_env_54.__ts2gml_capture_44 = 0;
    __ts2gml_env_54.__ts2gml_capture_46 = method({ __ts2gml_env_54: __ts2gml_env_54, __ts2gml_closure: true }, function () {
        var __ts2gml_env_54 = self.__ts2gml_env_54;
        __ts2gml_env_54.__ts2gml_capture_44 += 1;
        return 0;
    });
    var update = method({ __ts2gml_env_54: __ts2gml_env_54, __ts2gml_closure: true }, function () {
        var __ts2gml_env_54 = self.__ts2gml_env_54;
        (function (__ts2gml_assignment_4647_4, __ts2gml_env_54) {
            return __ts2gml_value_set(__ts2gml_assignment_4647_4[0], __ts2gml_assignment_4647_4[1], __ts2gml_value_get(__ts2gml_assignment_4647_4[0], __ts2gml_assignment_4647_4[1]) + __ts2gml_env_54.__ts2gml_capture_42);
        })([__ts2gml_env_54.__ts2gml_capture_45, __ts2gml_env_54.__ts2gml_capture_46()], __ts2gml_env_54);
        return __ts2gml_value_get(__ts2gml_env_54.__ts2gml_capture_45, 0);
    });
    scopeContextExpect("captured indexed assignment", update(), 12);
    scopeContextExpect("captured index evaluated once", __ts2gml_env_54.__ts2gml_capture_44, 1);
    __ts2gml_env_54.__ts2gml_capture_47 = 0;
    __ts2gml_env_54.__ts2gml_capture_48 = { run: method({ __ts2gml_env_54: __ts2gml_env_54, __ts2gml_closure: true }, function () {
            var __ts2gml_env_54 = self.__ts2gml_env_54;
            __ts2gml_env_54.__ts2gml_capture_47 += 1;
            return __ts2gml_env_54.__ts2gml_capture_47;
        }) };
    if (__ts2gml_value_truthy(__ts2gml_env_54.__ts2gml_capture_48)) {
        (function (__ts2gml_unused, __ts2gml_env_54, noArguments) {
            var __ts2gml_receiver = __ts2gml_env_54.__ts2gml_capture_48;
            var __ts2gml_method = __ts2gml_receiver.run;
            __ts2gml_method = is_method(__ts2gml_method) && !is_undefined(method_get_self(__ts2gml_method)) ? __ts2gml_method : method(is_array(__ts2gml_receiver) ? undefined : __ts2gml_receiver, __ts2gml_method);
            return method_call(__ts2gml_method, array_concat([], noArguments));
        })(undefined, __ts2gml_env_54, noArguments);
    }
    scopeContextExpect("optional spread callback retains environment", __ts2gml_env_54.__ts2gml_capture_47, 1);
    var packetFactory = method({ __ts2gml_env_54: __ts2gml_env_54, __ts2gml_closure: true }, function () {
        var __ts2gml_env_54 = self.__ts2gml_env_54;
        return __ts2gml_env_54.__ts2gml_capture_48;
    });
    {
        var __ts2gml_optional_4647_5 = packetFactory();
        if (__ts2gml_value_truthy(__ts2gml_optional_4647_5)) {
            (function (__ts2gml_unused, __ts2gml_optional_4647_5, noArguments) {
                var __ts2gml_receiver = __ts2gml_optional_4647_5;
                var __ts2gml_method = __ts2gml_receiver.run;
                __ts2gml_method = is_method(__ts2gml_method) && !is_undefined(method_get_self(__ts2gml_method)) ? __ts2gml_method : method(is_array(__ts2gml_receiver) ? undefined : __ts2gml_receiver, __ts2gml_method);
                return method_call(__ts2gml_method, array_concat([], noArguments));
            })(undefined, __ts2gml_optional_4647_5, noArguments);
        }
    }
    scopeContextExpect("optional factory spread callback retains environment", __ts2gml_env_54.__ts2gml_capture_47, 2);
    var invoke = function (read) { return read(); };
    scopeContextExpect("closure factory inside spread argument", (function (__ts2gml_unused, invoke) {
        var __ts2gml_callable = invoke;
        var __ts2gml_arguments = array_concat([], [(function (__ts2gml_capture_49_parameter) {
                var __ts2gml_env_68 = { __ts2gml_capture_49: __ts2gml_capture_49_parameter };
                return method({ __ts2gml_env_68: __ts2gml_env_68, __ts2gml_closure: true }, function () {
                    var __ts2gml_env_68 = self.__ts2gml_env_68;
                    return __ts2gml_env_68.__ts2gml_capture_49;
                });
            })(5)]);
        return is_method(__ts2gml_callable) ? method_call(__ts2gml_callable, __ts2gml_arguments) : script_execute_ext(__ts2gml_callable, __ts2gml_arguments);
    })(undefined, invoke), 5);
    __ts2gml_env_54.__ts2gml_capture_50 = 10;
    __ts2gml_env_54.__ts2gml_capture_51 = { run: method({ __ts2gml_env_54: __ts2gml_env_54, __ts2gml_closure: true }, function (amount) {
            var __ts2gml_env_54 = self.__ts2gml_env_54;
            return __ts2gml_env_54.__ts2gml_capture_50 + amount;
        }) };
    var changeSlot = method({ __ts2gml_env_54: __ts2gml_env_54, __ts2gml_closure: true }, function () {
        var __ts2gml_env_54 = self.__ts2gml_env_54;
        __ts2gml_env_54.__ts2gml_capture_51.run = function (amount) { return 100 + amount; };
        return 2;
    });
    scopeContextExpect("spread selects callback before argument side effects", (function (__ts2gml_unused, __ts2gml_env_54, changeSlot) {
        var __ts2gml_receiver = __ts2gml_env_54.__ts2gml_capture_51;
        var __ts2gml_method = __ts2gml_receiver.run;
        __ts2gml_method = is_method(__ts2gml_method) && !is_undefined(method_get_self(__ts2gml_method)) ? __ts2gml_method : method(is_array(__ts2gml_receiver) ? undefined : __ts2gml_receiver, __ts2gml_method);
        return method_call(__ts2gml_method, array_concat([], [changeSlot()]));
    })(undefined, __ts2gml_env_54, changeSlot), 12);
    scopeContextExpect("spread argument callback replacement persists", __ts2gml_env_54.__ts2gml_capture_51.run(2), 102);
    var spread = [4];
    scopeContextExpect("captured callback spread call", (function (__ts2gml_unused, defaults, spread) {
        var __ts2gml_callable = defaults;
        var __ts2gml_arguments = array_concat([], spread);
        return is_method(__ts2gml_callable) ? method_call(__ts2gml_callable, __ts2gml_arguments) : script_execute_ext(__ts2gml_callable, __ts2gml_arguments);
    })(undefined, defaults, spread), 16);
    __ts2gml_env_54.__ts2gml_capture_52 = 0;
    var finish = method({ __ts2gml_env_54: __ts2gml_env_54, __ts2gml_closure: true }, function (fail) {
        var __ts2gml_env_54 = self.__ts2gml_env_54;
        try {
            __ts2gml_env_54.__ts2gml_capture_52 += 1;
            if (__ts2gml_value_truthy(fail))
                throw "closure test";
            return __ts2gml_env_54.__ts2gml_capture_52;
        }
        finally {
            __ts2gml_env_54.__ts2gml_capture_52 += 10;
        }
    });
    scopeContextExpect("closure return through finally", finish(false), 1);
    scopeContextExpect("closure finally shares binding", __ts2gml_env_54.__ts2gml_capture_52, 11);
    try {
        finish(true);
    }
    catch (__ts2gml_caught_4647_6) {
        __ts2gml_env_54.__ts2gml_capture_52 += 100;
    }
    scopeContextExpect("closure throw through finally", __ts2gml_env_54.__ts2gml_capture_52, 122);
    var readCompleted = method({ __ts2gml_env_54: __ts2gml_env_54, __ts2gml_closure: true }, function () {
        var __ts2gml_env_54 = self.__ts2gml_env_54;
        return __ts2gml_env_54.__ts2gml_capture_52;
    });
    scopeContextExpect("closure remains callable after exception", readCompleted(), 122);
    __ts2gml_env_54.__ts2gml_capture_53 = 0;
    var readers = [];
    for (var iteration = 0; __ts2gml_value_truthy(iteration < 3); iteration++) {
        __ts2gml_env_54.__ts2gml_capture_53 += 1;
        __ts2gml_collection_push(readers, [method({ __ts2gml_env_54: __ts2gml_env_54, __ts2gml_closure: true }, function () {
                var __ts2gml_env_54 = self.__ts2gml_env_54;
                return __ts2gml_env_54.__ts2gml_capture_53;
            })]);
    }
    scopeContextExpect("loop-created callbacks share function binding", (function (__ts2gml_unused, readers) {
        var __ts2gml_receiver = readers;
        var __ts2gml_key = 0;
        var __ts2gml_method = __ts2gml_value_get(__ts2gml_receiver, __ts2gml_key);
        __ts2gml_method = is_method(__ts2gml_method) && !is_undefined(method_get_self(__ts2gml_method)) ? __ts2gml_method : method(is_array(__ts2gml_receiver) ? undefined : __ts2gml_receiver, __ts2gml_method);
        return method_call(__ts2gml_method, []);
    })(undefined, readers), 3);
    __ts2gml_env_54.__ts2gml_capture_53 += 1;
    scopeContextExpect("loop-created second callback sees mutation", (function (__ts2gml_unused, readers) {
        var __ts2gml_receiver = readers;
        var __ts2gml_key = 1;
        var __ts2gml_method = __ts2gml_value_get(__ts2gml_receiver, __ts2gml_key);
        __ts2gml_method = is_method(__ts2gml_method) && !is_undefined(method_get_self(__ts2gml_method)) ? __ts2gml_method : method(is_array(__ts2gml_receiver) ? undefined : __ts2gml_receiver, __ts2gml_method);
        return method_call(__ts2gml_method, []);
    })(undefined, readers), 4);
    var isolated = [];
    for (var iteration = 0; __ts2gml_value_truthy(iteration < 3); iteration++) {
        __ts2gml_collection_push(isolated, [closureContractShadow(iteration).outer]);
    }
    scopeContextExpect("per-call environments inside loop first", (function (__ts2gml_unused, isolated) {
        var __ts2gml_receiver = isolated;
        var __ts2gml_key = 0;
        var __ts2gml_method = __ts2gml_value_get(__ts2gml_receiver, __ts2gml_key);
        __ts2gml_method = is_method(__ts2gml_method) && !is_undefined(method_get_self(__ts2gml_method)) ? __ts2gml_method : method(is_array(__ts2gml_receiver) ? undefined : __ts2gml_receiver, __ts2gml_method);
        return method_call(__ts2gml_method, []);
    })(undefined, isolated), 0);
    scopeContextExpect("per-call environments inside loop last", (function (__ts2gml_unused, isolated) {
        var __ts2gml_receiver = isolated;
        var __ts2gml_key = 2;
        var __ts2gml_method = __ts2gml_value_get(__ts2gml_receiver, __ts2gml_key);
        __ts2gml_method = is_method(__ts2gml_method) && !is_undefined(method_get_self(__ts2gml_method)) ? __ts2gml_method : method(is_array(__ts2gml_receiver) ? undefined : __ts2gml_receiver, __ts2gml_method);
        return method_call(__ts2gml_method, []);
    })(undefined, isolated), 2);
    show_debug_message("TS2GML_CLOSURE_CONTRACT_OK");
}
