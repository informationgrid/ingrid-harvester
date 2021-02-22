export const elasticsearchMapping = {
    properties: {
        "mapping": {
            "base": {
                "properties": {
                    "attributions": {
                        "properties": {
                            "accrual_periodicity": {
                                "properties": {
                                    "count": {
                                        "type": "long"
                                    },
                                    "name": {
                                        "type": "text",
                                        "fields": {
                                            "keyword": {
                                                "type": "keyword",
                                                "ignore_above": 256
                                            }
                                        }
                                    }
                                }
                            },
                            "attribution": {
                                "type": "text",
                                "fields": {
                                    "keyword": {
                                        "type": "keyword",
                                        "ignore_above": 256
                                    }
                                }
                            },
                            "categories": {
                                "properties": {
                                    "count": {
                                        "type": "long"
                                    },
                                    "name": {
                                        "type": "text",
                                        "fields": {
                                            "keyword": {
                                                "type": "keyword",
                                                "ignore_above": 256
                                            }
                                        }
                                    }
                                }
                            },
                            "count": {
                                "type": "long"
                            },
                            "display_contact": {
                                "properties": {
                                    "count": {
                                        "type": "long"
                                    },
                                    "name": {
                                        "type": "text",
                                        "fields": {
                                            "keyword": {
                                                "type": "keyword",
                                                "ignore_above": 256
                                            }
                                        }
                                    }
                                }
                            },
                            "distributions": {
                                "properties": {
                                    "count": {
                                        "type": "long"
                                    },
                                    "number": {
                                        "type": "text",
                                        "fields": {
                                            "keyword": {
                                                "type": "keyword",
                                                "ignore_above": 256
                                            }
                                        }
                                    }
                                }
                            },
                            "format": {
                                "properties": {
                                    "count": {
                                        "type": "long"
                                    },
                                    "name": {
                                        "type": "text",
                                        "fields": {
                                            "keyword": {
                                                "type": "keyword",
                                                "ignore_above": 256
                                            }
                                        }
                                    }
                                }
                            },
                            "is_valid": {
                                "properties": {
                                    "count": {
                                        "type": "long"
                                    },
                                    "value": {
                                        "type": "text",
                                        "fields": {
                                            "keyword": {
                                                "type": "keyword",
                                                "ignore_above": 256
                                            }
                                        }
                                    }
                                }
                            },
                            "license": {
                                "properties": {
                                    "count": {
                                        "type": "long"
                                    },
                                    "name": {
                                        "type": "text",
                                        "fields": {
                                            "keyword": {
                                                "type": "keyword",
                                                "ignore_above": 256
                                            }
                                        }
                                    }
                                }
                            },
                            "spatial": {
                                "type": "long"
                            },
                            "temporal": {
                                "type": "long"
                            }
                        }
                    },
                    "duration": {
                        "type": "long"
                    },
                    "status": {
                        "properties": {
                            "code": {
                                "type": "text",
                                "fields": {
                                    "keyword": {
                                        "type": "keyword",
                                        "ignore_above": 256
                                    }
                                }
                            },
                            "url": {
                                "properties": {
                                    "attribution": {
                                        "properties": {
                                            "count": {
                                                "type": "long"
                                            },
                                            "name": {
                                                "type": "text",
                                                "fields": {
                                                    "keyword": {
                                                        "type": "keyword",
                                                        "ignore_above": 256
                                                    }
                                                }
                                            }
                                        }
                                    },
                                    "url": {
                                        "type": "text",
                                        "fields": {
                                            "keyword": {
                                                "type": "keyword",
                                                "ignore_above": 256
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    "timestamp": {
                        "type": "date"
                    }
                }
            }
        }
    }
};
