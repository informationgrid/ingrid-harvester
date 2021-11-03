/*
 *  ==================================================
 *  mcloud-importer
 *  ==================================================
 *  Copyright (C) 2017 - 2021 wemove digital solutions GmbH
 *  ==================================================
 *  Licensed under the EUPL, Version 1.2 or – as soon they will be
 *  approved by the European Commission - subsequent versions of the
 *  EUPL (the "Licence");
 *
 *  You may not use this work except in compliance with the Licence.
 *  You may obtain a copy of the Licence at:
 *
 *  https://joinup.ec.europa.eu/collection/eupl/eupl-text-eupl-12
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the Licence is distributed on an "AS IS" basis,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the Licence for the specific language governing permissions and
 *  limitations under the Licence.
 * ==================================================
 */

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
